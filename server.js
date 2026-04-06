import express from "express";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { uppercase, formatNumber, calculateAndFormatTotal } from "./utils/formatters.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PDF_BASE_URL = process.env.PDF_BASE_URL || `http://127.0.0.1:${PORT}`;

function readNumericEnv(value, fallback, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return fallback;
  return parsed;
}

const PDF_PAGE_POOL_SIZE = readNumericEnv(process.env.PDF_PAGE_POOL_SIZE, 0, 0);
const PDF_ASSET_WAIT_TIMEOUT_MS = readNumericEnv(process.env.PDF_ASSET_WAIT_TIMEOUT_MS, 6000, 0);
const PDF_WAIT_FOR_FONTS = String(process.env.PDF_WAIT_FOR_FONTS || "1") === "1";
const PDF_CONTENT_TIMEOUT_MS = readNumericEnv(process.env.PDF_CONTENT_TIMEOUT_MS, 25000, 5000);
const PDF_CONTENT_WAIT_UNTIL_OPTIONS = new Set(["domcontentloaded", "load", "networkidle0", "networkidle2"]);
const PDF_CONTENT_WAIT_UNTIL = PDF_CONTENT_WAIT_UNTIL_OPTIONS.has(process.env.PDF_CONTENT_WAIT_UNTIL)
  ? process.env.PDF_CONTENT_WAIT_UNTIL
  : "networkidle2";

let browserPromise;
const pagePool = [];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public", {
  maxAge: "30d",
  immutable: true,
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- UTILS ----------------

function safeText(val, fallback = "") {
  return String(val ?? "").trim() || fallback;
}

function sanitizeFileNamePart(value, fallback = "NA") {
  const cleaned = safeText(value, fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatExpiry(value) {
  const raw = safeText(value).toUpperCase();
  if (!raw) return "";

  const yyyyMm = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyyMm) {
    const year = Number(yyyyMm[1]);
    const month = Number(yyyyMm[2]);
    if (month >= 1 && month <= 12) {
      return `${MONTHS[month - 1]}-${String(year).slice(-2)}`;
    }
  }

  const mmYyyy = raw.match(/^(\d{1,2})[/-](\d{2,4})$/);
  if (mmYyyy) {
    const month = Number(mmYyyy[1]);
    const yearText = mmYyyy[2];
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    if (month >= 1 && month <= 12 && Number.isFinite(year)) {
      return `${MONTHS[month - 1]}-${String(year).slice(-2)}`;
    }
  }

  const monYear = raw.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s/]?(\d{2,4})$/);
  if (monYear) {
    const mon = `${monYear[1][0]}${monYear[1].slice(1).toLowerCase()}`;
    const yearText = monYear[2];
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    if (Number.isFinite(year)) {
      return `${mon}-${String(year).slice(-2)}`;
    }
  }

  return raw;
}

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatDateDdMmYyyy(value) {
  const raw = safeText(value);
  if (!raw) return "";

  const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) {
    const [, year, month, day] = yyyyMmDd;
    return `${day}-${month}-${year}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }

  return raw;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }

  return browserPromise;
}

async function closeBrowser() {
  if (!browserPromise) return;

  try {
    while (pagePool.length > 0) {
      const pooledPage = pagePool.pop();
      if (pooledPage && !pooledPage.isClosed()) {
        await pooledPage.close();
      }
    }

    const browser = await browserPromise;
    await browser.close();
  } catch (err) {
    console.error("Browser close error:", err);
  } finally {
    browserPromise = undefined;
  }
}

async function acquirePdfPage() {
  if (PDF_PAGE_POOL_SIZE > 0) {
    while (pagePool.length > 0) {
      const pooledPage = pagePool.pop();
      if (pooledPage && !pooledPage.isClosed()) {
        return pooledPage;
      }
    }
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setCacheEnabled(true);
  return page;
}

async function releasePdfPage(page) {
  if (!page || page.isClosed()) return;

  if (PDF_PAGE_POOL_SIZE <= 0) {
    await page.close();
    return;
  }

  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 5000 });
  } catch (err) {
    await page.close();
    return;
  }

  if (pagePool.length < PDF_PAGE_POOL_SIZE) {
    pagePool.push(page);
    return;
  }

  await page.close();
}

// ---------------- BUILD DATA ----------------

function buildInvoice(body = {}) {
  const source = body && typeof body === "object" ? body : {};

  const items = Object.values(source.data || {}).map((item) => {
    const rateRaw = safeText(item.rate);
    const quantityRaw = safeText(item.quantity);
    const rate = toNumber(rateRaw);
    const qty = toNumber(quantityRaw);
    const amountText = calculateAndFormatTotal(rateRaw, quantityRaw);
    const amountValue = toNumber(amountText);
    const amountDecimals = amountText.includes(".") ? amountText.split(".")[1].length : 0;

    return {
      item_name: uppercase(safeText(item.item_name)),
      batch_no: uppercase(safeText(item.batch_no)),
      exp: formatExpiry(item.exp),
      rate: formatNumber(rateRaw),
      quantity: formatNumber(quantityRaw),
      amount: amountText,
      amountValue,
      amountDecimals,
    };
  });

  const totalValue = items.reduce((sum, item) => sum + item.amountValue, 0);
  const maxTotalDecimals = items.reduce((max, item) => Math.max(max, item.amountDecimals), 0);
  const totalText = maxTotalDecimals > 0
    ? formatNumber(totalValue.toFixed(Math.min(maxTotalDecimals, 10)))
    : formatNumber(totalValue);

  const normalizedItems = items.map(({ amountValue, amountDecimals, ...rest }) => rest);

  const fallbackDate = new Date();
  const fallbackDateText = `${String(fallbackDate.getDate()).padStart(2, "0")}-${String(
    fallbackDate.getMonth() + 1
  ).padStart(2, "0")}-${fallbackDate.getFullYear()}`;

  return {
    date: formatDateDdMmYyyy(safeText(source.date, fallbackDateText)),
    dl_no: "HRN-115276",
    gst_no: uppercase(safeText(source.gst_no)),
    patient_name: uppercase(safeText(source.patient_name)),
    ip_no: uppercase(safeText(source.ip_no)),
    hospital_name: uppercase(safeText(source.hospital_display || source.hospital_name)),
    unit: uppercase(safeText(source.unit)),
    address: uppercase(safeText(source.address)),
    location: uppercase(safeText(source.location)),
    total_amount: totalText,
    data: normalizedItems,
    is_pdf: true,
  };
}

// ---------------- ROUTES ----------------

// Preview page
app.get("/", (req, res) => {
 res.render('form');
});


app.get("/preview", (req, res) => {
  res.render("test", {date: "15-08-2024", dl_no: "HRN-115276", gst_no: "07AAKFN5053A1ZK", patient_name: "John Doe", ip_no: "IP12345", hospital_name: "City Hospital", unit: "Unit 1", address: "123 Main St", location: "New Delhi", total_amount: "1234.56", is_pdf: true, data: [
    { item_name: "Medicine A", batch_no: "B123", exp: "Aug-25", rate: "100.00", quantity: "2", amount: "200.00" },
    { item_name: "Medicine B", batch_no: "B456", exp: "Sep-24", rate: "50.00", quantity: "3", amount: "150.00" },
  ]});
});

// Form page
app.get("/form", (req, res) => {
  res.render("form");
});

// 🔥 RENDER ROUTE (IMPORTANT)
app.post("/render", (req, res) => {
  const invoice = buildInvoice(req.body);
  res.render("test", invoice);
});



// 🔥 PDF GENERATE (FINAL CORRECT)
app.post("/generate", async (req, res) => {
  let page;

  try {
    page = await acquirePdfPage();

    // Inject actual data
    const invoice = buildInvoice(req.body);

    const html = await new Promise((resolve, reject) => {
      app.render("test", invoice, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    // Ensure /tw.css, images, and font paths resolve when rendering in Puppeteer.
    const htmlWithBase = html.includes("<head>")
      ? html.replace("<head>", `<head><base href="${PDF_BASE_URL}/">`)
      : html;

    await page.setContent(htmlWithBase, {
      waitUntil: PDF_CONTENT_WAIT_UNTIL,
      timeout: PDF_CONTENT_TIMEOUT_MS,
    });

    await page.evaluate(async ({ waitTimeoutMs, waitForFonts }) => {
      const withTimeout = (promise) => {
        if (!waitTimeoutMs || waitTimeoutMs <= 0) return promise;
        return Promise.race([
          promise,
          new Promise((resolve) => setTimeout(resolve, waitTimeoutMs)),
        ]);
      };

      const waitForImageReady = (img) => {
        const waitForLoad = img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });

        return waitForLoad.then(() => {
          if (typeof img.decode === "function") {
            return img.decode().catch(() => undefined);
          }

          return undefined;
        });
      };

      const images = Array.from(document.images || []);
      await withTimeout(Promise.all(
        images.map(waitForImageReady)
      ));

      if (waitForFonts && document.fonts && typeof document.fonts.ready?.then === "function") {
        await withTimeout(document.fonts.ready);
      }
    }, {
      waitTimeoutMs: PDF_ASSET_WAIT_TIMEOUT_MS,
      waitForFonts: PDF_WAIT_FOR_FONTS,
    });

    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      // width: '210mm',     // A4 width
      // height: '250mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0px",
        bottom: "0px",
        left: "0px",
        right: "0px",
      },
    });

    const ipNo = sanitizeFileNamePart(invoice.ip_no);
    const patientName = sanitizeFileNamePart(invoice.patient_name);
    const hospitalName = sanitizeFileNamePart(invoice.hospital_name);
    const location = sanitizeFileNamePart(invoice.location);
    const filename = `${ipNo} - ${patientName} (${hospitalName} - ${location}).pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    res.send(pdf);
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).send("PDF generation failed");
  } finally {
    if (page) {
      await releasePdfPage(page);
    }
  }
});

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);

  // Warm up browser once so the first PDF request is faster.
  getBrowser().catch((err) => {
    console.error("Browser warmup failed:", err);
  });
});
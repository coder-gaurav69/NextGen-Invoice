import express from "express";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { uppercase, formatNumber, calculateAndFormatTotal } from "./utils/formatters.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
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
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
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
    const mon = monYear[1];
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

// ---------------- BUILD DATA ----------------

function buildInvoice(body) {
  const items = Object.values(body.data || {}).map((item) => {
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

  return {
    date: safeText(body.date, new Date().toISOString().split("T")[0]),
    dl_no: "HRN-115276",
    gst_no: uppercase(safeText(body.gst_no)),
    patient_name: uppercase(safeText(body.patient_name)),
    ip_no: uppercase(safeText(body.ip_no)),
    hospital_name: uppercase(safeText(body.hospital_display || body.hospital_name)),
    unit: uppercase(safeText(body.unit)),
    address: uppercase(safeText(body.address)),
    location: uppercase(safeText(body.location)),
    total_amount: totalText,
    data: normalizedItems,
    is_pdf: true,
  };
}

// ---------------- ROUTES ----------------

// Preview page
app.get("/", (req, res) => {
  res.render("test", {
    date: new Date().toISOString().split("T")[0],
    dl_no: "HRN-115276",
    gst_no: "06AAACU7727R1ZN",
    patient_name: "John Doe",
    ip_no: "12345",
    hospital_name: "PARK HOSPITAL",
    unit: "(A UNIT OF UMKAL HEALTHCARE PVT.LTD)",
    address: "H-BLOCK, PALAM VIHAR, GURGRAM - 122017",
    location: "Delhi",
    total_amount: 1000,
    data: [],
    is_pdf: false,
  });
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
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 🔥 IMPORTANT: use goto (NOT setContent)
    await page.goto("http://localhost:3000", {
      waitUntil: "load",
    });

    // Inject actual data
    const invoice = buildInvoice(req.body);

    const html = await new Promise((resolve, reject) => {
      app.render("test", invoice, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    await page.setContent(html, {
      waitUntil: "load",
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

    await browser.close();

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
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
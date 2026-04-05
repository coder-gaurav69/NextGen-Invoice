import express from "express";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

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

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ---------------- BUILD DATA ----------------

function buildInvoice(body) {
  const items = Object.values(body.data || {}).map((item) => {
    const rate = toNumber(item.rate);
    const qty = toNumber(item.quantity);

    return {
      item_name: safeText(item.item_name),
      batch_no: safeText(item.batch_no),
      exp: safeText(item.exp),
      rate,
      quantity: qty,
      amount: +(rate * qty).toFixed(2),
    };
  });

  const total = items.reduce((s, i) => s + i.amount, 0);

  return {
    date: safeText(body.date, new Date().toISOString().split("T")[0]),
    dl_no: "HRN-115276",
    gst_no: safeText(body.gst_no),
    patient_name: safeText(body.patient_name),
    ip_no: safeText(body.ip_no),
    hospital_name: safeText(body.hospital_display || body.hospital_name),
    unit: safeText(body.unit),
    address: safeText(body.address),
    location: safeText(body.location),
    total_amount: total,
    data: items,
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
      width: "210mm",
      height: "290mm",
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

    const filename = `${invoice.ip_no} - ${invoice.patient_name}.pdf`;

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
import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.render("test", {
    data: [],
    date: '2024-06-05',
    dl_no: 'DL-00-000000',
    gst_no: '22AAAAA0000A1Z5',
    patient_name: 'John Doe',
    ip_no: '12345',
    hospital_name: 'PARK HOSPITAL',
    unit: 'MAIN UNIT',
    address: 'Sector 1, New Delhi',
    total_amount: 1000,
    is_pdf: false
  });
});

// PDF route
app.get("/pdf", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:3000", {
    waitUntil: "networkidle0"
  });

  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "0mm",
      bottom: "0mm",
      left: "0mm",
      right: "0mm"
    }
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline; filename=invoice.pdf"
  });

  res.send(pdf);
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
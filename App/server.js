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
app.use(express.json());

// Home route redirecting to form
const data = [
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
    { item_name: "Item 3", batch_no: "B003", exp: "2026-01", rate: "150" ,quantity: "2", amount: "300"},
]
app.get('/', (req, res) => {
    res.render("template", { data , date: "2024-06-01", patient_name: "John Doe", ip_no: "IP12345", hospital_name: "City Hospital", unit: "Unit A", address: "123 Street, City", gst_no: "GSTIN12345", total_amount: "450"});
});

// Route to show the form
app.get('/form', (req, res) => {
    res.render("form");
});

// Route to generate the PDF from form data
app.post('/generate', async (req, res) => {
    const { 
        date, 
        patient_name, 
        ip_no, 
        hospital_name, 
        custom_hospital_name,
        unit, 
        address, 
        gst_no, 
        location,
        data: formData,
        total_amount 
    } = req.body;

    const finalHospitalName = hospital_name === 'Other' ? custom_hospital_name : hospital_name;
    const filteredData = Array.isArray(formData) ? formData.filter(item => item.item_name) : [];

    try {
        // 1. Render EJS template to HTML string
        app.render("template", { 
            data: filteredData, 
            date, 
            patient_name, 
            ip_no, 
            hospital_name: finalHospitalName, 
            unit, 
            address, 
            gst_no, 
            total_amount 
        }, async (err, html) => {
            if (err) {
                console.error("EJS Render Error:", err);
                return res.status(500).send("Error rendering template");
            }

            // 2. Launch Puppeteer to generate PDF
            const browser = await puppeteer.launch({ headless: "new" });
            const page = await browser.newPage();
            
            // Inject base URL so relative assets (CSS/Images) can be found
            const baseUrl = `http://localhost:${PORT}/`;
            const htmlWithBase = html.replace('<head>', `<head><base href="${baseUrl}">`);
            
            await page.setContent(htmlWithBase, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
            });

            await browser.close();

            // 3. Set filename and send PDF
            // Format: Ip no - pt. Name (hospital name - location).pdf
            const cleanPatientName = patient_name.replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize for filename
            const filename = `${ip_no} - ${cleanPatientName} (${finalHospitalName} - ${location}).pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
        });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).send("An error occurred during PDF generation.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

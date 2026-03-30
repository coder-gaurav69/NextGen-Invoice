import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/`;

let browserPromise = null;

function getBrowser() {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        }).catch((error) => {
            browserPromise = null;
            throw error;
        });
    }

    return browserPromise;
}

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Home route redirecting to form

const data = [
    { item_name: 'FOSATED 150MG', batch_no: '134062501A', exp: 'May-27', rate: 3375, quantity: 1, amount: 3375 },
    { item_name: 'DENOSUREL 120MG', batch_no: 'DMV1B25007', exp: 'Dec-26', rate: 39118, quantity: 2, amount: 78236 },
    { item_name: 'ONIVYDE 43MG', batch_no: '24173', exp: 'Jan-28', rate: 86710.71, quantity: 2, amount: 173421.42 },
    { item_name: 'RASCASE 1.5MG', batch_no: 'UOX100125', exp: 'Dec-26', rate: 10890, quantity: 1, amount: 10890 },
    { item_name: 'PEG F 6MG', batch_no: 'PEG300425', exp: 'Dec-26', rate: 8498.43, quantity: 1, amount: 8498.43 }
];


app.get('/', (req, res) => {
    res.render("form");
    // res.render("template",{ data,  date: '2024-06-01', patient_name: 'John Doe', ip_no: '12345', hospital_name: 'PARK HOSPITAL', unit: '(A UNIT OF UMKAL HEALTHCARE PVT.LTD)', address: 'H-BLOCK, PALAM VIHAR, GURGRAM - 122017', gst_no: 'GST NO-06AAACU7727R1ZN', total_amount: 1000 });
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

    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const formattedData = filteredData.map(item => {
        if (item.exp && item.exp.includes('-')) {
            const parts = item.exp.split('-');
            if (parts.length === 2 && parts[0].length === 4) {
               const year = parts[0];
               const monthIndex = parseInt(parts[1], 10) - 1;
               if (monthIndex >= 0 && monthIndex < 12) {
                   item.exp = `${monthNames[monthIndex]}-${year}`;
               }
            }
        }
        return item;
    });

    try {
        // 1. Render EJS template to HTML string
        app.render("template", { 
            data: formattedData, 
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

            // 2. Reuse one browser instance for faster PDF generation on server
            const browser = await getBrowser();
            const page = await browser.newPage();

            let pdfBuffer;
            try {
                // Inject base URL so relative assets (CSS/Images) can be found
                const htmlWithBase = html.replace('<head>', `<head><base href="${BASE_URL}">`);

                await page.setContent(htmlWithBase, { waitUntil: 'load' });

                pdfBuffer = await page.pdf({
                    format: 'A4',
                    preferCSSPageSize: true,
                    printBackground: true,
                    pageRanges: '1',
                    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
                });
            } finally {
                await page.close();
            }

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

    // Warm browser once so first PDF request is faster.
    getBrowser().catch((error) => {
        console.error('Browser warm-up failed:', error);
    });
});

async function closeBrowserAndExit(signal) {
    if (browserPromise) {
        try {
            const browser = await browserPromise;
            await browser.close();
        } catch (error) {
            console.error('Error closing browser:', error);
        }
    }
    process.exit(0);
}

process.on('SIGINT', () => closeBrowserAndExit('SIGINT'));
process.on('SIGTERM', () => closeBrowserAndExit('SIGTERM'));

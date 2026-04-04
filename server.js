import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}/`;
const PDF_RENDER_MODE = process.env.PDF_RENDER_MODE || 'vector'; // raster | vector
const PDF_CONTENT_WAIT_UNTIL = process.env.PDF_CONTENT_WAIT_UNTIL || 'load';
const PDF_CONTENT_TIMEOUT_MS = Number.parseInt(
    process.env.PDF_CONTENT_TIMEOUT_MS || '45000',
    10
);
const PDF_NETWORK_IDLE_TIMEOUT_MS = Number.parseInt(
    process.env.PDF_NETWORK_IDLE_TIMEOUT_MS || '10000',
    10
);

let browserPromise = null;

const sanitizeFilenamePart = (value, fallback = '') => {
    const text = (value ?? '').toString().trim();
    if (!text) return fallback;
    const sanitized = text
        .replace(/[\r\n]+/g, ' ')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    return sanitized || fallback;
};

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
app.set("view cache", false);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Home route redirecting to form

const data = [
    { item_name: 'FOSATED 150MG', batch_no: '134062501A', exp: 'May-27', rate: 3375, quantity: 1, amount: 3375 },
    { item_name: 'DENOSUREL 120MG', batch_no: 'DMV1B25007', exp: 'Dec-26', rate: 39118, quantity: 2, amount: 78236 },
    { item_name: 'ONIVYDE 43MG', batch_no: '24173', exp: 'Jan-28', rate: 86710.71, quantity: 2, amount: 173421.42 },
    { item_name: 'RASCASE 1.5MG', batch_no: 'UOX100125', exp: 'Dec-26', rate: 10890, quantity: 1, amount: 10890 },
    { item_name: 'PEG F 6MG', batch_no: 'PEG300425', exp: 'Dec-26', rate: 8498.43, quantity: 1, amount: 8498.43 },
    { item_name: 'RASCASE 1.5MG', batch_no: 'UOX100125', exp: 'Dec-26', rate: 10890, quantity: 1, amount: 10890 },
    { item_name: 'PEG F 6MG', batch_no: 'PEG300425', exp: 'Dec-26', rate: 8498.43, quantity: 1, amount: 8498.43 }
    ,
    { item_name: 'RASCASE 1.5MG', batch_no: 'UOX100125', exp: 'Dec-26', rate: 10890, quantity: 1, amount: 10890 }
];


app.get('/', (req, res) => {
    res.render("form");
    // res.render("template",{ data,  date: '2024-06-01', patient_name: 'John Doe', ip_no: '12345', hospital_name: 'PARK HOSPITAL', unit: '(A UNIT OF UMKAL HEALTHCARE PVT.LTD)', address: 'H-BLOCK, PALAM VIHAR, GURGRAM - 122017', gst_no: 'GST NO-06AAACU7727R1ZN', total_amount: 1000 });
});
app.get('/temp', (req, res) => {
    // res.render("form");
    res.render("template",{ data,  date: '2024-06-01', patient_name: 'John Doe', ip_no: '12345', hospital_name: 'PARK HOSPITAL', unit: '(A UNIT OF UMKAL HEALTHCARE PVT.LTD)', address: 'H-BLOCK, PALAM VIHAR, GURGRAM - 122017', gst_no: 'GST NO-06AAACU7727R1ZN', total_amount: 1000, is_pdf: false, css_version: Date.now() });
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
        hospital_display,
        custom_hospital_name,
        unit, 
        address, 
        gst_no, 
        location,
        data: formData,
        total_amount 
    } = req.body;

    const finalHospitalName = hospital_name === 'Other'
        ? custom_hospital_name
        : (hospital_display || hospital_name);
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
            total_amount,
            is_pdf: true,
            css_version: Date.now()
        }, async (err, html) => {
            if (err) {
                console.error("EJS Render Error:", err);
                return res.status(500).send("Error rendering template");
            }

            let page;
            try {
                // 2. Reuse one browser instance for faster PDF generation on server
                const browser = await getBrowser();
                page = await browser.newPage();
                page.setDefaultNavigationTimeout(PDF_CONTENT_TIMEOUT_MS);
                page.setDefaultTimeout(PDF_CONTENT_TIMEOUT_MS);

                await page.evaluateOnNewDocument(() => {
                    const root = globalThis;
                    const clearMarks = function clearMarks(markName) {
                        if (root.performance && typeof root.performance.clearMarks === 'function') {
                            root.performance.clearMarks(markName);
                        }
                    };

                    let mgtRef = (root.mgt && typeof root.mgt === 'object') ? root.mgt : {};
                    mgtRef.clearMarks = clearMarks;

                    try {
                        Object.defineProperty(root, 'mgt', {
                            configurable: true,
                            get() {
                                return mgtRef;
                            },
                            set(value) {
                                mgtRef = (value && typeof value === 'object') ? value : {};
                                mgtRef.clearMarks = clearMarks;
                            }
                        });
                    } catch {
                        root.mgt = mgtRef;
                    }
                });

                let pdfBuffer;
                const finalHtml = html.replace(/<head>/i, `<head><base href="${BASE_URL}">`);
                const PDF_DEBUG = process.env.PDF_DEBUG === '1';
                const PDF_GRID_OVERLAY_MODE = (process.env.PDF_GRID_OVERLAY || 'auto').toLowerCase();
                const APPLY_GRID_OVERLAY = PDF_DEBUG || !['0', 'off', 'false'].includes(PDF_GRID_OVERLAY_MODE);
                const PDF_WIDTH_MM = 210;
                const PDF_HEIGHT_MM = 281;
                const MM_TO_PT = 72 / 25.4;
                const PDF_WIDTH_PT = PDF_WIDTH_MM * MM_TO_PT;
                const PDF_HEIGHT_PT = PDF_HEIGHT_MM * MM_TO_PT;
                const RASTER_SCALE = 3;
                const GRID_THICKNESS_PT_OVERRIDE = Number.parseFloat(
                    process.env.PDF_GRID_THICKNESS_PT || ''
                );
                const GRID_THICKNESS_PT_DEFAULT = PDF_DEBUG ? 3.5 : 1.0;

                const renderViewport = PDF_RENDER_MODE === 'raster'
                    ? { width: 794, height: 1070, deviceScaleFactor: RASTER_SCALE }
                    : { width: 794, height: 1070, deviceScaleFactor: 1 };

                await page.setViewport(renderViewport);
                await page.setCacheEnabled(false);
                await page.setContent(finalHtml, {
                    waitUntil: PDF_CONTENT_WAIT_UNTIL,
                    timeout: PDF_CONTENT_TIMEOUT_MS
                });
                if (!['networkidle0', 'networkidle2'].includes(PDF_CONTENT_WAIT_UNTIL)) {
                    try {
                        await page.waitForNetworkIdle({
                            idleTime: 500,
                            timeout: PDF_NETWORK_IDLE_TIMEOUT_MS
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        console.warn('PDF render network idle wait skipped:', message);
                    }
                }
                await page.emulateMediaType('print');

                const grid = await page.evaluate(() => {
                    const cells = Array.from(document.querySelectorAll(
                        'td.xl71, td.xl72, td.xl73, td.xl71-last, td.xl72-last, td.xl73-last'
                    ));
                    if (!cells.length) return null;

                    const round = (v) => Math.round(v * 2) / 2; // 0.5px steps
                    const xs = [];
                    const ys = [];
                    for (const cell of cells) {
                        const r = cell.getBoundingClientRect();
                        xs.push(round(r.left), round(r.right));
                        ys.push(round(r.top), round(r.bottom));
                    }
                    xs.sort((a, b) => a - b);
                    ys.sort((a, b) => a - b);
                    const uniq = (arr) => arr.filter((v, i) => i === 0 || Math.abs(v - arr[i - 1]) > 0.25);
                    const ux = uniq(xs);
                    const uy = uniq(ys);
                    const sampleCell = cells[0];
                    const sampleStyle = sampleCell ? window.getComputedStyle(sampleCell) : null;
                    const borderWidthPx = sampleStyle ? Number.parseFloat(sampleStyle.borderTopWidth) : 0;
                    return {
                        xs: ux,
                        ys: uy,
                        minX: ux[0],
                        maxX: ux[ux.length - 1],
                        minY: uy[0],
                        maxY: uy[uy.length - 1],
                        borderWidthPx: Number.isFinite(borderWidthPx) ? borderWidthPx : 0,
                        viewport: {
                            width: document.documentElement.scrollWidth,
                            height: document.documentElement.scrollHeight
                        }
                    };
                });

                const applyGridOverlay = async (doc) => {
                    if (!APPLY_GRID_OVERLAY || !grid) return doc;
                    const pdfPage = doc.getPages()[0];
                    const pdfWidth = pdfPage.getWidth();
                    const pdfHeight = pdfPage.getHeight();
                    const scaleX = pdfWidth / grid.viewport.width;
                    const scaleY = pdfHeight / grid.viewport.height;
                    const toPdfX = (x) => x * scaleX;
                    const toPdfY = (y) => pdfHeight - y * scaleY;
                    const xMin = toPdfX(grid.minX);
                    const xMax = toPdfX(grid.maxX);
                    const topY = toPdfY(grid.minY);
                    const bottomY = toPdfY(grid.maxY);
                    const lineColor = PDF_DEBUG ? rgb(1, 0, 0) : rgb(0, 0, 0);
                    const derivedThicknessPt = grid.borderWidthPx > 0
                        ? grid.borderWidthPx * Math.min(scaleX, scaleY)
                        : 0;
                    const thicknessPt = Number.isFinite(GRID_THICKNESS_PT_OVERRIDE)
                        ? GRID_THICKNESS_PT_OVERRIDE
                        : Math.max(GRID_THICKNESS_PT_DEFAULT, derivedThicknessPt);

                    for (const x of grid.xs) {
                        const px = toPdfX(x);
                        pdfPage.drawLine({
                            start: { x: px, y: topY },
                            end: { x: px, y: bottomY },
                            thickness: thicknessPt,
                            color: lineColor
                        });
                    }

                    for (const y of grid.ys) {
                        const py = toPdfY(y);
                        pdfPage.drawLine({
                            start: { x: xMin, y: py },
                            end: { x: xMax, y: py },
                            thickness: thicknessPt,
                            color: lineColor
                        });
                    }

                    if (PDF_DEBUG) {
                        const font = await doc.embedFont(StandardFonts.HelveticaBold);
                        pdfPage.drawText('PDF DEBUG OVERLAY ON', {
                            x: 24,
                            y: pdfHeight - 32,
                            size: 14,
                            font,
                            color: rgb(1, 0, 0)
                        });
                    }

                    return doc;
                };

                if (PDF_RENDER_MODE === 'raster') {
                    const pngBuffer = await page.screenshot({ type: 'png', fullPage: false });
                    const pdfDoc = await PDFDocument.create();
                    const pngImage = await pdfDoc.embedPng(pngBuffer);
                    const pdfPage = pdfDoc.addPage([PDF_WIDTH_PT, PDF_HEIGHT_PT]);
                    pdfPage.drawImage(pngImage, {
                        x: 0,
                        y: 0,
                        width: PDF_WIDTH_PT,
                        height: PDF_HEIGHT_PT
                    });
                    await applyGridOverlay(pdfDoc);
                    pdfBuffer = await pdfDoc.save();
                } else {
                    pdfBuffer = await page.pdf({
                        width: '210mm',
                        height: '283mm',
                        printBackground: true,
                        pageRanges: '1',
                        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
                    });
                    const pdfDoc = await PDFDocument.load(pdfBuffer);
                    await applyGridOverlay(pdfDoc);
                    pdfBuffer = await pdfDoc.save();
                }
                // 3. Set filename and send PDF
                // Format: Ip no - pt. Name (hospital name - location).pdf
                const safeIpNo = sanitizeFilenamePart(ip_no, 'IP');
                const safePatientName = sanitizeFilenamePart(patient_name, 'Patient');
                const safeHospitalName = sanitizeFilenamePart(finalHospitalName, '');
                const safeLocation = sanitizeFilenamePart(location, '');
                const hospitalPart = safeHospitalName
                    ? (safeLocation ? `${safeHospitalName} - ${safeLocation}` : safeHospitalName)
                    : safeLocation;
                const filename = hospitalPart
                    ? `${safeIpNo} - ${safePatientName} (${hospitalPart}).pdf`
                    : `${safeIpNo} - ${safePatientName}.pdf`;

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(pdfBuffer);
            } catch (error) {
                console.error("PDF Generation Error:", error);
                if (!res.headersSent) {
                    res.status(500).send("An error occurred during PDF generation.");
                }
            } finally {
                if (page) {
                    try {
                        await page.close();
                    } catch (error) {
                        console.error('Error closing PDF page:', error);
                    }
                }
            }
        });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        if (!res.headersSent) {
            res.status(500).send("An error occurred during PDF generation.");
        }
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

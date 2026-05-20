import puppeteer from 'puppeteer';

/**
 * PDF Generation Service
 * 
 * Receives pre-rendered HTML from the client (which handles all SVG rendering,
 * stroke progression, character grids, etc.) and converts it to PDF using Puppeteer.
 * 
 * This approach ensures pixel-perfect output matching the client preview,
 * since the client already has all the complex rendering logic for SVG characters,
 * stroke data, guide characters, mi-grids, etc.
 */

// ─── Puppeteer singleton ───

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    });
  }
  return browserInstance;
}

/**
 * Build the full HTML document wrapping the client-rendered pages HTML.
 * Includes all necessary CSS for proper rendering.
 */
function buildPdfDocument(pagesHtml, pageSize = 'A4') {
  const isA5 = pageSize === 'A5';
  const pageRule = isA5 ? 'size: A4 landscape;' : 'size: A4;';
  const bodyWidth = isA5 ? '297mm' : '210mm';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    /* ═══ Reset ═══ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${bodyWidth};
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ═══ Font Variables ═══ */
    :root {
      --font-chinese: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --grid-border: #b0b0b0;
      --grid-cross: #d4d4d4;
    }

    /* ═══ Print Page ═══ */
    .print-page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      background: #fff;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .print-page:last-child {
      page-break-after: auto;
    }

    /* ═══ A5 Booklet Sheet ═══ */
    .print-page.a5-booklet-sheet {
      width: 297mm;
      min-height: 210mm;
      padding: 0;
      display: flex;
      flex-direction: row;
    }

    .a5-booklet-half {
      width: 148.5mm;
      height: 210mm;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    .a5-booklet-content {
      position: relative;
    }

    /* ═══ Page Elements ═══ */
    .page-element {
      position: absolute;
      min-width: 1px;
      min-height: 1px;
    }

    /* Text Element */
    .page-element[data-type="text"] {
      color: #000;
      font-family: var(--font-chinese);
      font-size: 14pt;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Hanzi Text Element (SVG characters) */
    .page-element[data-type="hanziText"] {
      overflow: visible;
    }

    .hanzi-text-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
    }

    .hanzi-text-char {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .hanzi-text-char svg {
      display: block;
    }

    .hanzi-text-fallback {
      font-family: var(--font-chinese);
      font-weight: 700;
    }

    /* Stroke Progression Element */
    .page-element[data-type="strokeProgression"] {
      overflow: visible;
    }

    .stroke-progression-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .stroke-step {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
    }

    .stroke-step svg {
      display: block;
    }

    .stroke-step-num {
      text-align: center;
      font-family: var(--font-ui);
      margin-top: 1px;
    }

    /* Practice Grid */
    .practice-grid {
      border-collapse: collapse;
      table-layout: fixed;
    }

    .practice-grid td {
      position: relative;
      border: 1px solid var(--grid-border);
      text-align: center;
      vertical-align: middle;
      padding: 0;
    }

    .practice-grid .grid-cell {
      width: 12mm;
      height: 12mm;
    }

    /* Cross lines inside grid cell (田字格) */
    .grid-cell .cross-h,
    .grid-cell .cross-v {
      position: absolute;
      pointer-events: none;
    }

    .grid-cell .cross-h {
      top: 50%;
      left: 0;
      right: 0;
      height: 0;
      border-top: 1px dashed var(--grid-cross);
    }

    .grid-cell .cross-v {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 1px dashed var(--grid-cross);
    }

    /* Diagonal lines inside grid cell (米字格) */
    .grid-cell .diag-left,
    .grid-cell .diag-right {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .grid-cell .diag-left {
      background: linear-gradient(
        to bottom right,
        transparent calc(50% - 0.5px),
        var(--grid-cross) calc(50% - 0.5px),
        var(--grid-cross) calc(50% + 0.5px),
        transparent calc(50% + 0.5px)
      );
    }

    .grid-cell .diag-right {
      background: linear-gradient(
        to bottom left,
        transparent calc(50% - 0.5px),
        var(--grid-cross) calc(50% - 0.5px),
        var(--grid-cross) calc(50% + 0.5px),
        transparent calc(50% + 0.5px)
      );
    }

    /* Guide character (faint text) */
    .grid-cell .guide-char {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-chinese);
      color: #000;
      pointer-events: none;
      line-height: 1;
      z-index: 0;
    }

    /* Guide character SVG (dashed stroke) */
    .grid-cell .guide-char-svg {
      position: absolute;
      top: 55%;
      left: 50%;
      width: 88%;
      height: 88%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0;
    }

    .grid-cell .guide-char-svg svg {
      width: 100%;
      height: 100%;
    }

    /* Character Block (compound element) */
    .character-block {
      display: flex;
      flex-direction: column;
      gap: 2mm;
      width: 100%;
    }

    .character-block .char-header {
      display: flex;
      align-items: flex-end;
      gap: 3mm;
      overflow: hidden;
      max-width: 100%;
    }

    .character-block .char-main {
      font-family: var(--font-chinese);
      font-size: 36pt;
      font-weight: 700;
      line-height: 1;
      color: #000;
      display: inline-flex;
      align-items: flex-end;
    }

    .character-block .char-main svg {
      display: block;
    }

    .character-block .char-strokes {
      font-family: var(--font-chinese);
      font-size: 18pt;
      color: #333;
      display: flex;
      gap: 1mm;
      flex-wrap: wrap;
      align-items: flex-end;
      line-height: 1.2;
      overflow: hidden;
      max-width: 100%;
    }

    .character-block .char-strokes svg {
      display: inline-block;
      vertical-align: bottom;
      flex-shrink: 0;
    }

    .character-block .char-info {
      display: flex;
      gap: 2mm;
      align-items: baseline;
      overflow: hidden;
      flex-wrap: wrap;
      max-width: 100%;
    }

    .character-block .char-pinyin {
      font-family: var(--font-ui);
      font-size: 11pt;
      color: #cc0000;
      font-style: italic;
    }

    .character-block .char-meaning {
      font-family: var(--font-ui);
      font-size: 10pt;
      color: #555;
      font-style: italic;
    }

    /* CharBlock grid wrapper */
    .charblock-grid-wrapper {
      display: flex;
      flex-direction: column;
    }

    /* Shape Element */
    .page-element[data-type="shape"] {
      background: transparent;
      border: 1px solid #000;
    }

    /* Table Element */
    .generic-table {
      border-collapse: collapse;
      width: 100%;
      font-family: var(--font-chinese);
    }

    .generic-table th,
    .generic-table td {
      border: 1px solid #999;
      padding: 2mm;
      text-align: center;
      font-size: 11pt;
    }

    .generic-table th {
      background: #f5f5f5;
      font-weight: 600;
    }

    /* Callout */
    .callout-wrap {
      display: flex;
      gap: 2.5mm;
      height: 100%;
      padding: 3mm;
    }

    .callout-icon {
      flex: 0 0 auto;
      font-size: 18pt;
      line-height: 1;
    }

    .callout-content { min-width: 0; }
    .callout-title { font-weight: 800; margin-bottom: 1mm; }
    .callout-body { white-space: pre-wrap; line-height: 1.35; }

    /* Divider */
    .divider-line { flex: 1; min-width: 5mm; }
    .divider-label { flex: 0 0 auto; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }

    /* Checklist */
    .checklist-title { font-weight: 800; margin-bottom: 2mm; }
    .checklist-items { display: flex; flex-direction: column; }
    .checklist-row { display: flex; align-items: center; gap: 2mm; line-height: 1.25; }
    .checklist-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4mm;
      height: 4mm;
      border: 1.5px solid;
      font-size: 8pt;
      line-height: 1;
      flex: 0 0 auto;
    }

    /* Image */
    .page-element[data-type="image"] img {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* ═══ Print rules ═══ */
    @page {
      ${pageRule}
      margin: 0;
    }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/**
 * Generate PDF from client-rendered HTML.
 * @param {Object} params
 * @param {string} params.pagesHtml - Pre-rendered HTML from the client
 * @param {string} params.pageSize - 'A4' or 'A5' (booklet)
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generatePdf({ pagesHtml, pageSize = 'A4' }) {
  if (!pagesHtml) {
    throw new Error('pagesHtml is required for PDF generation');
  }

  // Build full HTML document
  const html = buildPdfDocument(pagesHtml, pageSize);

  // Render with Puppeteer
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Additional wait to ensure font rendering completes
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfOptions = {
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    };

    if (pageSize === 'A5') {
      pdfOptions.landscape = true;
      pdfOptions.format = 'A4';
    } else {
      pdfOptions.format = 'A4';
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Cleanup: close the browser instance.
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

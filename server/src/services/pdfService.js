import puppeteer from 'puppeteer';

/**
 * PDF Generation Service
 * 
 * Renders template elements + data into a proper PDF using Puppeteer.
 * Replicates the frontend rendering logic with embedded fonts.
 */

/**
 * Replace {{variable}} placeholders in a string with data values.
 */
function replaceVariables(template, data, index) {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (key === '_index') return String(index + 1);
    if (key === '_index0') return String(index);
    if (key in data) {
      const val = data[key];
      if (Array.isArray(val)) return val.join(' ');
      return String(val);
    }
    return _match;
  });
}

/**
 * Deep resolve all string variables in element props.
 */
function resolveElementProps(elementProps, data, index) {
  return resolveValue(JSON.parse(JSON.stringify(elementProps)), data, index);
}

function resolveValue(value, data, index) {
  if (typeof value === 'string') return replaceVariables(value, data, index);
  if (Array.isArray(value)) return value.map(item => resolveValue(item, data, index));
  if (value && typeof value === 'object') {
    const resolved = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      resolved[key] = resolveValue(nestedValue, data, index);
    }
    return resolved;
  }
  return value;
}

/**
 * Get slot transform for multi-item pages.
 */
function getSlotTransform(index, itemsPerPage) {
  if (!itemsPerPage || itemsPerPage <= 1) return { x: 0, y: 0 };
  const slotCount = Math.min(itemsPerPage, 4);
  const pagePadding = 10;
  const gap = 6;
  const contentWidth = 210 - pagePadding * 2;
  const contentHeight = 297 - pagePadding * 2;
  const columns = slotCount === 2 || slotCount === 3 ? 1 : 2;
  const rows = Math.ceil(slotCount / columns);
  const slotWidth = (contentWidth - gap * (columns - 1)) / columns;
  const slotHeight = (contentHeight - gap * (rows - 1)) / rows;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: col * (slotWidth + gap),
    y: row * (slotHeight + gap),
  };
}

function getElementBounds(elements) {
  if (!elements.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function scaleElementTypography(element, scale) {
  const fontProps = ['fontSize', 'charFontSize', 'cellSize', 'gridCellSize', 'lineGap', 'cellPadding'];
  fontProps.forEach(prop => {
    const value = element[prop];
    if (typeof value === 'number') {
      element[prop] = Math.max(value * scale, prop === 'fontSize' ? 5 : 1);
    }
  });
}

function layoutElementsForItemsPerPage(templateElements, itemsPerPage) {
  if (!itemsPerPage || itemsPerPage <= 1) return templateElements;

  const slotCount = Math.min(itemsPerPage, 4);
  const pagePadding = 10;
  const gap = 6;
  const contentWidth = 210 - pagePadding * 2;
  const contentHeight = 297 - pagePadding * 2;
  const columns = slotCount === 2 || slotCount === 3 ? 1 : 2;
  const rows = Math.ceil(slotCount / columns);
  const slotWidth = (contentWidth - gap * (columns - 1)) / columns;
  const slotHeight = (contentHeight - gap * (rows - 1)) / rows;

  const bounds = getElementBounds(templateElements);
  if (!bounds) return templateElements;

  const scale = Math.min(slotWidth / bounds.width, slotHeight / bounds.height);

  return templateElements.map(el => {
    const copy = JSON.parse(JSON.stringify(el));
    copy.x = pagePadding + (copy.x - bounds.minX) * scale;
    copy.y = pagePadding + (copy.y - bounds.minY) * scale;
    copy.width *= scale;
    copy.height *= scale;
    scaleElementTypography(copy, scale);
    return copy;
  });
}

/**
 * Generate pages from template elements + data.
 */
function generatePages(templateElements, dataArray, itemsPerPage) {
  const pages = [];

  if (!dataArray || dataArray.length === 0) {
    pages.push({ pageNum: 1, elements: templateElements.map(el => ({ ...el })) });
    return pages;
  }

  if (!itemsPerPage || itemsPerPage <= 0) {
    for (let i = 0; i < dataArray.length; i++) {
      const pageElements = templateElements.map(el => {
        const resolved = resolveElementProps(el, dataArray[i], i);
        resolved.id = `${resolved.id}_p${i}`;
        return resolved;
      });
      pages.push({ pageNum: i + 1, elements: pageElements });
    }
    return pages;
  }

  const totalPages = Math.ceil(dataArray.length / itemsPerPage);
  for (let p = 0; p < totalPages; p++) {
    const startIdx = p * itemsPerPage;
    const slice = dataArray.slice(startIdx, startIdx + itemsPerPage);
    const pageElements = [];
    for (let i = 0; i < slice.length; i++) {
      const globalIdx = startIdx + i;
      const slot = getSlotTransform(i, itemsPerPage);
      templateElements.forEach(el => {
        const resolved = resolveElementProps(el, slice[i], globalIdx);
        resolved.x += slot.x;
        resolved.y += slot.y;
        resolved.id = resolved.id + `_p${p}_i${i}`;
        pageElements.push(resolved);
      });
    }
    pages.push({ pageNum: p + 1, elements: pageElements });
  }

  return pages;
}

// ─── HTML Rendering ───

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderGridTableHtml(rows, cols, cellSize, borderColor, borderWidth, showCross, guideChar, guideOpacity, guideFillRows) {
  let html = '<table class="practice-grid">';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td class="grid-cell" style="width:${cellSize}mm;height:${cellSize}mm;border-color:${borderColor};border-width:${borderWidth}px;">`;
      if (showCross) {
        html += '<div class="cross-h"></div><div class="cross-v"></div>';
      }
      if (guideChar && r < guideFillRows) {
        html += `<span class="guide-char" style="opacity:${guideOpacity};font-size:${cellSize * 0.8}mm;">${escapeHtml(guideChar)}</span>`;
      }
      html += '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function renderElementHtml(props) {
  const style = `position:absolute;left:${props.x}mm;top:${props.y}mm;z-index:${props.zIndex || 1};`;
  
  switch (props.type) {
    case 'text': {
      const p = props;
      const w = p.width ? `width:${p.width}mm;` : '';
      const h = p.height ? `height:${p.height}mm;` : '';
      return `<div class="page-element" data-type="text" style="${style}${w}${h}font-size:${p.fontSize}pt;font-family:${p.fontFamily};font-weight:${p.fontWeight};font-style:${p.fontStyle};text-decoration:${p.textDecoration};color:${p.color};background-color:${p.backgroundColor};text-align:${p.textAlign};line-height:${p.lineHeight};white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(p.content)}</div>`;
    }

    case 'practiceGrid': {
      const p = props;
      return `<div class="page-element" data-type="practiceGrid" style="${style}width:auto;height:auto;">${renderGridTableHtml(p.rows, p.cols, p.cellSize, p.borderColor, p.borderWidth, p.showCrossLines, p.guideCharacter, p.guideOpacity, p.guideFillRows)}</div>`;
    }

    case 'characterBlock': {
      const p = props;
      let html = `<div class="page-element" data-type="characterBlock" style="${style}width:${p.width}mm;height:auto;"><div class="character-block">`;

      // Header
      html += '<div class="char-header">';
      html += `<span class="char-main" style="font-size:${p.charFontSize}pt;">${escapeHtml(p.character)}</span>`;
      if (p.showStrokeProgression && p.strokeProgression) {
        html += `<span class="char-strokes">${escapeHtml(p.strokeProgression)}</span>`;
      }
      html += '</div>';

      // Info
      html += '<div class="char-info">';
      if (p.pinyin) html += `<span class="char-pinyin">/${escapeHtml(p.pinyin)}/</span>`;
      if (p.hanViet) html += `<span class="char-pinyin" style="color:#0066cc;">${escapeHtml(p.hanViet)}</span>`;
      if (p.meaningVi) html += `<span class="char-meaning">${escapeHtml(p.meaningVi)}</span>`;
      html += '</div>';

      // Grid
      html += renderGridTableHtml(p.gridRows, p.gridCols, p.gridCellSize, p.gridBorderColor || '#b0b0b0', 1, p.gridShowCross, p.character, p.gridGuideOpacity, p.gridGuideFillRows);

      html += '</div></div>';
      return html;
    }

    case 'table': {
      const p = props;
      const h = p.autoHeight ? 'height:auto;' : `height:${p.height}mm;`;
      let html = `<div class="page-element" data-type="table" style="${style}width:${p.width}mm;${h}overflow:hidden;">`;
      html += `<table class="generic-table" style="width:100%;${p.autoHeight ? 'height:auto;' : 'height:100%;'}table-layout:fixed;border-collapse:collapse;">`;

      const tableData = p.tableData || [];
      for (let r = 0; r < p.tableRows; r++) {
        html += '<tr>';
        for (let c = 0; c < p.tableCols; c++) {
          const tag = r === 0 ? 'th' : 'td';
          const bg = r === 0 ? (p.headerBg || '#f0f0f0') : (p.cellBg || '#ffffff');
          const cellContent = tableData[r]?.[c] ?? '';
          html += `<${tag} style="border:1px solid ${p.borderColor};font-size:${p.fontSize}pt;font-family:${p.fontFamily};color:${p.fontColor || '#000000'};padding:${p.cellPadding}mm;background:${bg};vertical-align:middle;word-break:break-word;overflow:hidden;">${escapeHtml(cellContent)}</${tag}>`;
        }
        html += '</tr>';
      }

      html += '</table></div>';
      return html;
    }

    case 'shape': {
      const p = props;
      let shapeStyle = `${style}width:${p.width}mm;height:${p.height}mm;`;
      if (p.shapeType === 'line') {
        shapeStyle += `border:none;border-top:${p.borderWidth}px ${p.borderStyle} ${p.borderColor};height:0!important;min-height:0!important;background:transparent;`;
      } else if (p.shapeType === 'circle' || p.shapeType === 'ellipse') {
        shapeStyle += `border-radius:50%;border:${p.borderWidth}px ${p.borderStyle} ${p.borderColor};background:${p.backgroundColor};`;
      } else if (p.shapeType === 'roundedRect') {
        shapeStyle += `border-radius:${p.borderRadiusTL}px ${p.borderRadiusTR}px ${p.borderRadiusBR}px ${p.borderRadiusBL}px;border:${p.borderWidth}px ${p.borderStyle} ${p.borderColor};background:${p.backgroundColor};`;
      } else {
        const radius = `${p.borderRadiusTL || 0}px ${p.borderRadiusTR || 0}px ${p.borderRadiusBR || 0}px ${p.borderRadiusBL || 0}px`;
        shapeStyle += `border-radius:${radius};border:${p.borderWidth}px ${p.borderStyle} ${p.borderColor};background:${p.backgroundColor};`;
      }
      return `<div class="page-element" data-type="shape" style="${shapeStyle}"></div>`;
    }

    case 'image': {
      const p = props;
      let imgStyle = `${style}width:${p.width}mm;height:${p.height}mm;overflow:hidden;`;
      if (p.borderRadius) imgStyle += `border-radius:${p.borderRadius}px;`;
      if (p.borderWidth) imgStyle += `border:${p.borderWidth}px solid ${p.borderColor};`;
      if (p.opacity !== undefined && p.opacity !== 1) imgStyle += `opacity:${p.opacity};`;
      if (p.src) {
        return `<div class="page-element" data-type="image" style="${imgStyle}"><img src="${p.src}" style="width:100%;height:100%;object-fit:${p.objectFit};display:block;" /></div>`;
      }
      return `<div class="page-element" data-type="image" style="${imgStyle}"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;font-size:11px;">No image</div></div>`;
    }

    case 'callout': {
      const p = props;
      return `<div class="page-element" data-type="callout" style="${style}width:${p.width}mm;height:${p.height}mm;background:${p.backgroundColor};border:1px solid ${p.borderColor};border-left:4px solid ${p.accentColor};border-radius:${p.borderRadius}px;color:${p.color};font-family:${p.fontFamily};font-size:${p.fontSize}pt;overflow:hidden;">
        <div class="callout-wrap">
          <div class="callout-icon" style="color:${p.accentColor};">${escapeHtml(p.icon)}</div>
          <div class="callout-content">
            <div class="callout-title">${escapeHtml(p.title)}</div>
            <div class="callout-body">${escapeHtml(p.body)}</div>
          </div>
        </div>
      </div>`;
    }

    case 'divider': {
      const p = props;
      const ornament = p.ornament === 'dot' ? '•' : p.ornament === 'diamond' ? '◆' : p.ornament === 'hanzi' ? '漢' : '';
      const labelText = [ornament, p.label, ornament].filter(Boolean).join(' ');
      return `<div class="page-element" data-type="divider" style="${style}width:${p.width}mm;height:${p.height}mm;display:flex;align-items:center;gap:2mm;color:${p.color};font-size:${p.fontSize}pt;overflow:hidden;">
        <span class="divider-line" style="border-top:${p.lineWidth}px ${p.lineStyle} ${p.lineColor};"></span>
        <span class="divider-label">${escapeHtml(labelText)}</span>
        <span class="divider-line" style="border-top:${p.lineWidth}px ${p.lineStyle} ${p.lineColor};"></span>
      </div>`;
    }

    case 'checklist': {
      const p = props;
      let html = `<div class="page-element" data-type="checklist" style="${style}width:${p.width}mm;height:${p.height}mm;border:1px solid ${p.borderColor};border-radius:10px;padding:3mm;color:${p.color};font-family:${p.fontFamily};font-size:${p.fontSize}pt;overflow:hidden;">`;
      html += `<div class="checklist-title" style="color:${p.accentColor};">${escapeHtml(p.title)}</div>`;
      html += `<div class="checklist-items" style="gap:${p.lineGap}mm;">`;
      (p.items || '').split('\n').filter(item => item.trim()).forEach(item => {
        const borderRadius = p.boxStyle === 'circle' ? '50%' : '2px';
        html += `<div class="checklist-row"><span class="checklist-box" style="border-color:${p.accentColor};border-radius:${borderRadius};">${escapeHtml(p.checkedSymbol || '')}</span><span>${escapeHtml(item)}</span></div>`;
      });
      html += '</div></div>';
      return html;
    }

    default:
      return '';
  }
}

/**
 * Build full HTML document for PDF rendering.
 * Embeds all CSS and fonts directly for reliable rendering.
 */
function buildPdfHtml(pages) {
  let pagesHtml = '';
  pages.forEach((page, idx) => {
    pagesHtml += `<div class="print-page" ${idx < pages.length - 1 ? 'style="page-break-after:always;"' : ''}>`;
    page.elements.forEach(props => {
      pagesHtml += renderElementHtml(props);
    });
    pagesHtml += '</div>';
  });

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
      width: 210mm;
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ═══ Print Page ═══ */
    .print-page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      background: #fff;
      position: relative;
      overflow: hidden;
    }

    /* ═══ Page Elements ═══ */
    .page-element {
      position: absolute;
      min-width: 1px;
      min-height: 1px;
    }

    .page-element[data-type="text"] {
      color: #000;
      font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      font-size: 14pt;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* ═══ Practice Grid ═══ */
    .practice-grid {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .practice-grid td {
      position: relative;
      border: 1px solid #b0b0b0;
      text-align: center;
      vertical-align: middle;
      padding: 0;
    }
    .grid-cell .cross-h, .grid-cell .cross-v {
      position: absolute;
      pointer-events: none;
    }
    .grid-cell .cross-h {
      top: 50%;
      left: 0;
      right: 0;
      height: 0;
      border-top: 1px dashed #d4d4d4;
    }
    .grid-cell .cross-v {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 1px dashed #d4d4d4;
    }
    .grid-cell .guide-char {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      color: #000;
      pointer-events: none;
      line-height: 1;
      z-index: 0;
    }

    /* ═══ Character Block ═══ */
    .character-block {
      display: flex;
      flex-direction: column;
      gap: 2mm;
      width: 100%;
    }
    .char-header {
      display: flex;
      align-items: flex-end;
      gap: 3mm;
    }
    .char-main {
      font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      font-size: 36pt;
      font-weight: 700;
      line-height: 1;
      color: #000;
    }
    .char-strokes {
      font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      font-size: 18pt;
      color: #333;
      display: flex;
      gap: 1mm;
      flex-wrap: wrap;
      align-items: flex-end;
      line-height: 1.2;
    }
    .char-info {
      display: flex;
      gap: 2mm;
      align-items: baseline;
    }
    .char-pinyin {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      color: #cc0000;
      font-style: italic;
    }
    .char-meaning {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      color: #555;
      font-style: italic;
    }

    /* ═══ Table ═══ */
    .generic-table {
      border-collapse: collapse;
      font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', sans-serif;
    }
    .generic-table th, .generic-table td {
      text-align: center;
      vertical-align: middle;
    }
    .generic-table th {
      font-weight: 600;
    }

    /* ═══ Callout ═══ */
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

    /* ═══ Divider ═══ */
    .divider-line { flex: 1; min-width: 5mm; }
    .divider-label { flex: 0 0 auto; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }

    /* ═══ Checklist ═══ */
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

    /* ═══ Print rules ═══ */
    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

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
 * Generate PDF from template elements and data.
 * @param {Object} params
 * @param {Array} params.templateElements - Template element props
 * @param {Array} params.dataArray - Data array for variable replacement
 * @param {number} params.itemsPerPage - Items per page
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generatePdf({ templateElements, dataArray, itemsPerPage }) {
  // Layout elements for multi-item pages
  const layoutedElements = layoutElementsForItemsPerPage(templateElements, itemsPerPage);
  
  // Generate all pages
  const pages = generatePages(layoutedElements, dataArray || [], itemsPerPage);

  // Build HTML
  const html = buildPdfHtml(pages);

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

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

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

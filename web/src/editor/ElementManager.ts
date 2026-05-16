/**
 * ElementManager — manages all elements on the A4 page.
 * Handles creation, DOM rendering, and serialization.
 */
import type {
  ElementType, AnyElementProps, TextElementProps,
  PracticeGridProps, CharacterBlockProps, TableElementProps,
  ShapeElementProps, ShapeVariant, ImageElementProps,
  CalloutElementProps, DividerElementProps, ChecklistElementProps
} from '../types.ts';

let elementCounter = 0;

export function generateId(): string {
  return `el_${Date.now()}_${++elementCounter}`;
}

/** Convert mm ↔ px (96 DPI: 1mm ≈ 3.7795px) */
export const MM_TO_PX = 3.7795275591;

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

// ─── Default Props Factories ───

function baseProps(type: ElementType): AnyElementProps {
  return {
    id: generateId(),
    type,
    x: 10,
    y: 10,
    width: 80,
    height: 20,
    rotation: 0,
    zIndex: 1,
    locked: false,
  } as AnyElementProps;
}

export function getDefaultProps(type: ElementType): AnyElementProps {
  switch (type) {
    case 'text':
      return {
        ...baseProps(type),
        type: 'text',
        width: 100,
        height: 15,
        content: 'Double-click to edit text',
        fontSize: 14,
        fontFamily: 'Noto Sans SC',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: 'transparent',
        textAlign: 'left',
        lineHeight: 1.5,
      } as TextElementProps;

    case 'practiceGrid':
      return {
        ...baseProps(type),
        type: 'practiceGrid',
        width: 170,
        height: 50,
        rows: 3,
        cols: 10,
        cellSize: 12,
        borderColor: '#b0b0b0',
        borderWidth: 1,
        showCrossLines: true,
        guideCharacter: '',
        guideOpacity: 0.12,
        guideFillRows: 1,
        guideFontSize: 28,
      } as PracticeGridProps;

    case 'characterBlock':
      return {
        ...baseProps(type),
        type: 'characterBlock',
        width: 180,
        height: 70,
        character: '你',
        pinyin: 'nǐ',
        hanViet: 'NỄ',
        meaningVi: 'bạn, anh, chị',
        strokeProgression: '丿 𠆢 亻 亻 你 你 你',
        showStrokeProgression: true,
        charFontSize: 36,
        gridRows: 3,
        gridCols: 10,
        gridCellSize: 12,
        gridBorderColor: '#b0b0b0',
        gridShowCross: true,
        gridGuideOpacity: 0.12,
        gridGuideFillRows: 1,
      } as CharacterBlockProps;

    case 'table':
      return {
        ...baseProps(type),
        type: 'table',
        width: 160,
        height: 60,
        tableRows: 4,
        tableCols: 4,
        tableData: [],
        headerBg: '#f0f0f0',
        borderColor: '#999999',
        cellPadding: 2,
        fontSize: 11,
        fontFamily: 'Noto Sans SC',
        fontColor: '#000000',
        cellBg: '#ffffff',
        autoHeight: false,
      } as TableElementProps;

    case 'shape':
      return {
        ...baseProps(type),
        type: 'shape',
        width: 60,
        height: 40,
        shapeType: 'rectangle' as ShapeVariant,
        borderColor: '#000000',
        borderWidth: 1,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderRadiusTL: 0,
        borderRadiusTR: 0,
        borderRadiusBR: 0,
        borderRadiusBL: 0,
      } as ShapeElementProps;

    case 'image':
      return {
        ...baseProps(type),
        type: 'image',
        width: 60,
        height: 60,
        src: '',
        objectFit: 'contain',
        opacity: 1,
        borderRadius: 0,
        borderColor: '#000000',
        borderWidth: 0,
      } as ImageElementProps;

    case 'callout':
      return {
        ...baseProps(type),
        type: 'callout',
        width: 120,
        height: 36,
        title: 'Ghi nhớ',
        body: 'Viết chậm, đúng thứ tự nét và giữ khoảng cách đều.',
        icon: '✦',
        accentColor: '#f59e0b',
        backgroundColor: '#fff7ed',
        borderColor: '#fed7aa',
        fontSize: 10,
        fontFamily: 'Noto Sans SC',
        color: '#432818',
        borderRadius: 12,
      } as CalloutElementProps;

    case 'divider':
      return {
        ...baseProps(type),
        type: 'divider',
        width: 160,
        height: 12,
        label: 'Luyện tập',
        lineColor: '#111827',
        lineWidth: 1,
        lineStyle: 'solid',
        ornament: 'hanzi',
        fontSize: 10,
        color: '#111827',
      } as DividerElementProps;

    case 'checklist':
      return {
        ...baseProps(type),
        type: 'checklist',
        width: 95,
        height: 54,
        title: 'Tự kiểm tra',
        items: 'Đọc pinyin\nNhớ nghĩa\nViết đúng nét',
        boxStyle: 'square',
        checkedSymbol: '',
        borderColor: '#d1d5db',
        accentColor: '#2563eb',
        fontSize: 10,
        fontFamily: 'Noto Sans SC',
        color: '#111827',
        lineGap: 2,
      } as ChecklistElementProps;

    default:
      return baseProps('text');
  }
}

// ─── DOM Rendering ───

export function createElementDOM(props: AnyElementProps): HTMLDivElement {
  const el = document.createElement('div');
  el.id = props.id;
  el.className = 'page-element';
  el.dataset.type = props.type;
  el.style.left = props.x + 'mm';
  el.style.top = props.y + 'mm';
  el.style.width = props.width + 'mm';
  el.style.height = props.height + 'mm';
  el.style.zIndex = String(props.zIndex);

  if (props.rotation) {
    el.style.transform = `rotate(${props.rotation}deg)`;
  }

  switch (props.type) {
    case 'text':       renderTextElement(el, props as TextElementProps); break;
    case 'practiceGrid': renderPracticeGrid(el, props as PracticeGridProps); break;
    case 'characterBlock': renderCharacterBlock(el, props as CharacterBlockProps); break;
    case 'table':      renderGenericTable(el, props as TableElementProps); break;
    case 'shape':      renderShape(el, props as ShapeElementProps); break;
    case 'image':      renderImage(el, props as ImageElementProps); break;
    case 'callout':    renderCallout(el, props as CalloutElementProps); break;
    case 'divider':    renderDivider(el, props as DividerElementProps); break;
    case 'checklist':  renderChecklist(el, props as ChecklistElementProps); break;
  }

  return el;
}

function renderTextElement(el: HTMLElement, p: TextElementProps): void {
  el.style.fontSize = p.fontSize + 'pt';
  el.style.fontFamily = p.fontFamily;
  el.style.fontWeight = p.fontWeight;
  el.style.fontStyle = p.fontStyle;
  el.style.textDecoration = p.textDecoration;
  el.style.color = p.color;
  el.style.backgroundColor = p.backgroundColor;
  el.style.textAlign = p.textAlign;
  el.style.lineHeight = String(p.lineHeight);
  el.innerText = p.content;
}

function buildGridTable(
  rows: number, cols: number, cellSize: number,
  borderColor: string, borderWidth: number,
  showCross: boolean,
  guideChar: string, guideOpacity: number, guideFillRows: number
): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'practice-grid';

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'grid-cell';
      td.style.width = cellSize + 'mm';
      td.style.height = cellSize + 'mm';
      td.style.borderColor = borderColor;
      td.style.borderWidth = borderWidth + 'px';

      if (showCross) {
        td.appendChild(Object.assign(document.createElement('div'), { className: 'cross-h' }));
        td.appendChild(Object.assign(document.createElement('div'), { className: 'cross-v' }));
      }

      if (guideChar && r < guideFillRows) {
        const span = document.createElement('span');
        span.className = 'guide-char';
        span.textContent = guideChar;
        span.style.opacity = String(guideOpacity);
        span.style.fontSize = (cellSize * 0.8) + 'mm';
        td.appendChild(span);
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  return table;
}

function renderPracticeGrid(el: HTMLElement, p: PracticeGridProps): void {
  el.style.height = 'auto';
  el.style.width = 'auto';
  el.innerHTML = '';
  el.appendChild(buildGridTable(
    p.rows, p.cols, p.cellSize,
    p.borderColor, p.borderWidth,
    p.showCrossLines,
    p.guideCharacter, p.guideOpacity, p.guideFillRows
  ));
  p.width = p.cols * p.cellSize + 2;
  p.height = p.rows * p.cellSize + 2;
}

function renderCharacterBlock(el: HTMLElement, p: CharacterBlockProps): void {
  el.style.height = 'auto';
  el.innerHTML = '';

  const block = document.createElement('div');
  block.className = 'character-block';

  // Header: character + strokes
  const header = document.createElement('div');
  header.className = 'char-header';

  const mainChar = document.createElement('span');
  mainChar.className = 'char-main';
  mainChar.textContent = p.character;
  mainChar.style.fontSize = p.charFontSize + 'pt';
  header.appendChild(mainChar);

  if (p.showStrokeProgression && p.strokeProgression) {
    const strokes = document.createElement('span');
    strokes.className = 'char-strokes';
    strokes.textContent = p.strokeProgression;
    header.appendChild(strokes);
  }
  block.appendChild(header);

  // Info line
  const info = document.createElement('div');
  info.className = 'char-info';

  if (p.pinyin) {
    const py = document.createElement('span');
    py.className = 'char-pinyin';
    py.textContent = `/${p.pinyin}/`;
    info.appendChild(py);
  }
  if (p.hanViet) {
    const hv = document.createElement('span');
    hv.className = 'char-pinyin';
    hv.style.color = '#0066cc';
    hv.textContent = p.hanViet;
    info.appendChild(hv);
  }
  if (p.meaningVi) {
    const mv = document.createElement('span');
    mv.className = 'char-meaning';
    mv.textContent = p.meaningVi;
    info.appendChild(mv);
  }
  block.appendChild(info);

  // Practice grid
  block.appendChild(buildGridTable(
    p.gridRows, p.gridCols, p.gridCellSize,
    p.gridBorderColor, 1,
    p.gridShowCross,
    p.character, p.gridGuideOpacity, p.gridGuideFillRows
  ));

  el.appendChild(block);
}

function renderGenericTable(el: HTMLElement, p: TableElementProps): void {
  if (p.autoHeight) {
    el.style.height = 'auto';
  }
  el.innerHTML = '';
  el.style.overflow = 'hidden';

  const table = document.createElement('table');
  table.className = 'generic-table';
  table.style.width = '100%';
  table.style.height = p.autoHeight ? 'auto' : '100%';
  table.style.tableLayout = 'fixed';
  table.style.borderCollapse = 'collapse';

  // Ensure tableData has enough rows/cols
  if (!p.tableData) p.tableData = [];
  while (p.tableData.length < p.tableRows) {
    p.tableData.push(new Array(p.tableCols).fill(''));
  }
  for (let r = 0; r < p.tableRows; r++) {
    if (!p.tableData[r]) p.tableData[r] = [];
    while (p.tableData[r].length < p.tableCols) {
      p.tableData[r].push('');
    }
  }

  for (let r = 0; r < p.tableRows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < p.tableCols; c++) {
      const cell = r === 0 ? document.createElement('th') : document.createElement('td');
      cell.style.border = `1px solid ${p.borderColor}`;
      cell.style.fontSize = p.fontSize + 'pt';
      cell.style.fontFamily = p.fontFamily;
      cell.style.color = p.fontColor || '#000000';
      cell.style.padding = p.cellPadding + 'mm';
      cell.style.background = r === 0 ? p.headerBg : (p.cellBg || '#ffffff');
      cell.style.verticalAlign = 'middle';
      cell.style.wordBreak = 'break-word';
      cell.style.overflow = 'hidden';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.textContent = p.tableData[r]?.[c] ?? '';
      tr.appendChild(cell);
    }
    table.appendChild(tr);
  }
  el.appendChild(table);
}

function renderShape(el: HTMLElement, p: ShapeElementProps): void {
  // Reset classes
  el.className = 'page-element';
  el.dataset.type = 'shape';
  el.innerHTML = '';

  const radius = `${p.borderRadiusTL}px ${p.borderRadiusTR}px ${p.borderRadiusBR}px ${p.borderRadiusBL}px`;

  switch (p.shapeType) {
    case 'line':
      el.classList.add('shape-line');
      el.style.borderTop = `${p.borderWidth}px ${p.borderStyle} ${p.borderColor}`;
      el.style.height = '0';
      el.style.minHeight = '0';
      el.style.backgroundColor = 'transparent';
      el.style.borderRadius = '0';
      break;

    case 'circle':
      el.style.borderRadius = '50%';
      el.style.border = `${p.borderWidth}px ${p.borderStyle} ${p.borderColor}`;
      el.style.backgroundColor = p.backgroundColor;
      break;

    case 'ellipse':
      el.style.borderRadius = '50%';
      el.style.border = `${p.borderWidth}px ${p.borderStyle} ${p.borderColor}`;
      el.style.backgroundColor = p.backgroundColor;
      break;

    case 'roundedRect':
      el.style.borderRadius = radius;
      el.style.border = `${p.borderWidth}px ${p.borderStyle} ${p.borderColor}`;
      el.style.backgroundColor = p.backgroundColor;
      break;

    case 'rectangle':
    default:
      el.style.borderRadius = radius;
      el.style.border = `${p.borderWidth}px ${p.borderStyle} ${p.borderColor}`;
      el.style.backgroundColor = p.backgroundColor;
      break;
  }
}

function renderImage(el: HTMLElement, p: ImageElementProps): void {
  el.className = 'page-element';
  el.dataset.type = 'image';
  el.innerHTML = '';
  el.style.overflow = 'hidden';
  el.style.borderRadius = p.borderRadius ? p.borderRadius + 'px' : '0';
  el.style.border = p.borderWidth ? `${p.borderWidth}px solid ${p.borderColor}` : 'none';
  el.style.opacity = String(p.opacity);

  if (p.src) {
    const img = document.createElement('img');
    img.src = p.src;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = p.objectFit;
    img.style.display = 'block';
    img.draggable = false;
    el.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.style.width = '100%';
    placeholder.style.height = '100%';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.background = '#f0f0f0';
    placeholder.style.color = '#999';
    placeholder.style.fontSize = '11px';
    placeholder.textContent = 'No image';
    el.appendChild(placeholder);
  }
}

function renderCallout(el: HTMLElement, p: CalloutElementProps): void {
  el.className = 'page-element';
  el.dataset.type = 'callout';
  el.innerHTML = '';
  el.style.background = p.backgroundColor;
  el.style.border = `1px solid ${p.borderColor}`;
  el.style.borderLeft = `4px solid ${p.accentColor}`;
  el.style.borderRadius = p.borderRadius + 'px';
  el.style.color = p.color;
  el.style.fontFamily = p.fontFamily;
  el.style.fontSize = p.fontSize + 'pt';
  el.style.overflow = 'hidden';

  const wrap = document.createElement('div');
  wrap.className = 'callout-wrap';

  const icon = document.createElement('div');
  icon.className = 'callout-icon';
  icon.style.color = p.accentColor;
  icon.textContent = p.icon;

  const content = document.createElement('div');
  content.className = 'callout-content';

  const title = document.createElement('div');
  title.className = 'callout-title';
  title.textContent = p.title;

  const body = document.createElement('div');
  body.className = 'callout-body';
  body.textContent = p.body;

  content.append(title, body);
  wrap.append(icon, content);
  el.appendChild(wrap);
}

function renderDivider(el: HTMLElement, p: DividerElementProps): void {
  el.className = 'page-element';
  el.dataset.type = 'divider';
  el.innerHTML = '';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '2mm';
  el.style.color = p.color;
  el.style.fontSize = p.fontSize + 'pt';
  el.style.overflow = 'hidden';

  const left = document.createElement('span');
  const right = document.createElement('span');
  left.className = 'divider-line';
  right.className = 'divider-line';
  [left, right].forEach(line => {
    line.style.borderTop = `${p.lineWidth}px ${p.lineStyle} ${p.lineColor}`;
  });

  const label = document.createElement('span');
  label.className = 'divider-label';
  const ornament = p.ornament === 'dot' ? '•' : p.ornament === 'diamond' ? '◆' : p.ornament === 'hanzi' ? '漢' : '';
  label.textContent = [ornament, p.label, ornament].filter(Boolean).join(' ');

  el.append(left, label, right);
}

function renderChecklist(el: HTMLElement, p: ChecklistElementProps): void {
  el.className = 'page-element';
  el.dataset.type = 'checklist';
  el.innerHTML = '';
  el.style.border = `1px solid ${p.borderColor}`;
  el.style.borderRadius = '10px';
  el.style.padding = '3mm';
  el.style.color = p.color;
  el.style.fontFamily = p.fontFamily;
  el.style.fontSize = p.fontSize + 'pt';
  el.style.overflow = 'hidden';

  const title = document.createElement('div');
  title.className = 'checklist-title';
  title.style.color = p.accentColor;
  title.textContent = p.title;
  el.appendChild(title);

  const list = document.createElement('div');
  list.className = 'checklist-items';
  list.style.gap = p.lineGap + 'mm';

  p.items.split('\n').filter(item => item.trim()).forEach(item => {
    const row = document.createElement('div');
    row.className = 'checklist-row';
    const box = document.createElement('span');
    box.className = 'checklist-box';
    box.style.borderColor = p.accentColor;
    box.style.borderRadius = p.boxStyle === 'circle' ? '50%' : '2px';
    box.textContent = p.checkedSymbol;
    const text = document.createElement('span');
    text.textContent = item;
    row.append(box, text);
    list.appendChild(row);
  });

  el.appendChild(list);
}

// ─── Update existing DOM ───

export function updateElementDOM(el: HTMLElement, props: AnyElementProps): void {
  el.style.left = props.x + 'mm';
  el.style.top = props.y + 'mm';
  el.style.zIndex = String(props.zIndex);
  el.style.transform = props.rotation ? `rotate(${props.rotation}deg)` : '';

  switch (props.type) {
    case 'text':       renderTextElement(el, props as TextElementProps); break;
    case 'practiceGrid': renderPracticeGrid(el, props as PracticeGridProps); break;
    case 'characterBlock': renderCharacterBlock(el, props as CharacterBlockProps); break;
    case 'table':      renderGenericTable(el, props as TableElementProps); break;
    case 'shape':      renderShape(el, props as ShapeElementProps); break;
    case 'image':      renderImage(el, props as ImageElementProps); break;
    case 'callout':    renderCallout(el, props as CalloutElementProps); break;
    case 'divider':    renderDivider(el, props as DividerElementProps); break;
    case 'checklist':  renderChecklist(el, props as ChecklistElementProps); break;
  }
}

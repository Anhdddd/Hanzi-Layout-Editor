/**
 * ElementManager — manages all elements on the A4 page.
 * Handles creation, DOM rendering, and serialization.
 */
import type {
  ElementType, AnyElementProps, TextElementProps,
  HanziTextProps, StrokeProgressionProps, PracticeGridProps, MiGridProps, CharacterBlockProps, TableElementProps,
  ShapeElementProps, ShapeVariant, ImageElementProps,
  CalloutElementProps, DividerElementProps, ChecklistElementProps
} from '../types.ts';
import { getCharacter, generateStrokeProgressionSVGs, generateCharacterSVG, generateGuideSVG } from '../data/characterService.ts';

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
        fontFamily: 'LXGW WenKai',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: 'transparent',
        textAlign: 'left',
        lineHeight: 1.5,
      } as TextElementProps;

    case 'hanziText':
      return {
        ...baseProps(type),
        type: 'hanziText',
        width: 120,
        height: 20,
        content: '你好世界',
        charSize: 24,
        charGap: 1,
        color: '#000000',
        lineHeight: 1.2,
      } as HanziTextProps;

    case 'strokeProgression':
      return {
        ...baseProps(type),
        type: 'strokeProgression',
        width: 180,
        height: 20,
        character: '{{character}}',
        stepSize: 24,
        stepGap: 1,
        completedColor: '#000000',
        activeColor: '#cc0000',
        showStepNumbers: false,
        numberFontSize: 8,
        numberColor: '#666666',
        showFullCharFirst: true,
        fullCharColor: '#000000',
      } as StrokeProgressionProps;

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

    case 'miGrid':
      return {
        ...baseProps(type),
        type: 'miGrid',
        width: 170,
        height: 50,
        rows: 3,
        cols: 10,
        cellSize: 12,
        borderColor: '#b0b0b0',
        borderWidth: 1,
        showCrossLines: true,
        showDiagonalLines: true,
        guideCharacter: '',
        guideOpacity: 0.12,
        guideFillRows: 1,
        guideFontSize: 28,
      } as MiGridProps;

    case 'characterBlock':
      return {
        ...baseProps(type),
        type: 'characterBlock',
        width: 180,
        height: 70,
        character: '{{character}}',
        pinyin: '{{pinyin}}',
        hanViet: '',
        meaningVi: '{{meaning_vi}}',
        strokeProgression: '',
        showStrokeProgression: true,
        charFontSize: 36,
        gridType: 'tian',
        gridRows: 3,
        gridCols: 10,
        gridCellSize: 12,
        gridBorderColor: '#b0b0b0',
        gridBorderOpacity: 1,
        gridCrossColor: '#d4d4d4',
        gridCrossOpacity: 1,
        gridShowCross: true,
        gridShowDiagonal: false,
        gridGuideOpacity: 0.12,
        gridGuideFillRows: 1,
        gridRowGap: 0,
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
        fontFamily: 'LXGW WenKai',
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
        fontFamily: 'LXGW WenKai',
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
        fontFamily: 'LXGW WenKai',
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
    case 'hanziText':  renderHanziText(el, props as HanziTextProps); break;
    case 'strokeProgression': renderStrokeProgression(el, props as StrokeProgressionProps); break;
    case 'practiceGrid': renderPracticeGrid(el, props as PracticeGridProps); break;
    case 'miGrid':     renderMiGrid(el, props as MiGridProps); break;
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

function renderHanziText(el: HTMLElement, p: HanziTextProps): void {
  el.innerHTML = '';
  el.style.overflow = 'visible';

  const wrapper = document.createElement('div');
  wrapper.className = 'hanzi-text-wrapper';
  wrapper.style.display = 'flex';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.gap = `${(p.charGap * p.lineHeight)}mm ${p.charGap}mm`;
  wrapper.style.alignItems = 'flex-end';

  const content = p.content.replace(/\{\{.*?\}\}/g, '').trim();
  const chars = content.split('').filter(ch => ch !== ' ' && ch !== '\n');

  // If content is only template variables (nothing left after stripping), show placeholder
  if (chars.length === 0 && p.content.trim().length > 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'hanzi-text-placeholder';
    placeholder.textContent = p.content;
    placeholder.style.color = '#999';
    placeholder.style.fontSize = '11px';
    placeholder.style.fontStyle = 'italic';
    el.appendChild(placeholder);
    return;
  }

  for (const ch of chars) {
    const charData = getCharacter(ch);
    if (charData && charData.strokes.length > 0) {
      const span = document.createElement('span');
      span.className = 'hanzi-text-char';
      span.innerHTML = generateCharacterSVG(charData, Math.round(p.charSize * 1.5), p.color);
      wrapper.appendChild(span);
    } else {
      // Fallback: render as text
      const span = document.createElement('span');
      span.className = 'hanzi-text-char hanzi-text-fallback';
      span.textContent = ch;
      span.style.fontSize = p.charSize + 'pt';
      span.style.color = p.color;
      wrapper.appendChild(span);
    }
  }

  el.appendChild(wrapper);
}

function renderStrokeProgression(el: HTMLElement, p: StrokeProgressionProps): void {
  el.innerHTML = '';
  el.style.overflow = 'visible';

  const wrapper = document.createElement('div');
  wrapper.className = 'stroke-progression-wrapper';
  wrapper.style.display = 'flex';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.gap = p.stepGap + 'mm';
  wrapper.style.alignItems = 'flex-start';

  const charStr = p.character.replace(/\{\{.*?\}\}/g, '').trim();
  const charData = charStr.length === 1 ? getCharacter(charStr) : null;

  if (!charData || charData.strokes.length === 0) {
    // Show placeholder
    const placeholder = document.createElement('span');
    placeholder.style.color = '#999';
    placeholder.style.fontSize = '11px';
    placeholder.textContent = p.character || 'Set character';
    el.appendChild(placeholder);
    return;
  }

  const size = Math.round(p.stepSize * 1.5);

  // Optionally show full character first
  if (p.showFullCharFirst) {
    const step = document.createElement('div');
    step.className = 'stroke-step';
    step.innerHTML = generateCharacterSVG(charData, size, p.fullCharColor);
    if (p.showStepNumbers) {
      const num = document.createElement('div');
      num.className = 'stroke-step-num';
      num.style.fontSize = p.numberFontSize + 'pt';
      num.style.color = p.numberColor;
      num.textContent = '全';
      step.appendChild(num);
    }
    wrapper.appendChild(step);
  }

  // Render each progression step
  const strokes = charData.strokes;
  for (let stepIdx = 0; stepIdx < strokes.length; stepIdx++) {
    let paths = '';
    for (let i = 0; i <= stepIdx; i++) {
      const color = i === stepIdx ? p.activeColor : p.completedColor;
      paths += `<path d="${strokes[i]}" fill="${color}" />`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`;

    const step = document.createElement('div');
    step.className = 'stroke-step';
    step.innerHTML = svg;

    if (p.showStepNumbers) {
      const num = document.createElement('div');
      num.className = 'stroke-step-num';
      num.style.fontSize = p.numberFontSize + 'pt';
      num.style.color = p.numberColor;
      num.textContent = String(stepIdx + 1);
      step.appendChild(num);
    }

    wrapper.appendChild(step);
  }

  el.appendChild(wrapper);
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
        // Try SVG dashed guide
        const guideCharData = guideChar.length === 1 ? getCharacter(guideChar) : null;
        if (guideCharData && guideCharData.strokes.length > 0) {
          const guideDiv = document.createElement('div');
          guideDiv.className = 'guide-char guide-char-svg';
          guideDiv.innerHTML = generateGuideSVG(guideCharData, 100, Math.min(guideOpacity * 8, 1));
          td.appendChild(guideDiv);
        } else {
          const span = document.createElement('span');
          span.className = 'guide-char';
          span.textContent = guideChar;
          span.style.opacity = String(guideOpacity);
          span.style.fontSize = (cellSize * 0.8) + 'mm';
          td.appendChild(span);
        }
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

function renderMiGrid(el: HTMLElement, p: MiGridProps): void {
  el.style.height = 'auto';
  el.style.width = 'auto';
  el.innerHTML = '';
  el.appendChild(buildMiGridTable(
    p.rows, p.cols, p.cellSize,
    p.borderColor, p.borderWidth,
    p.showCrossLines, p.showDiagonalLines,
    p.guideCharacter, p.guideOpacity, p.guideFillRows
  ));
  p.width = p.cols * p.cellSize + 2;
  p.height = p.rows * p.cellSize + 2;
}

function buildMiGridTable(
  rows: number, cols: number, cellSize: number,
  borderColor: string, borderWidth: number,
  showCross: boolean, showDiagonal: boolean,
  guideChar: string, guideOpacity: number, guideFillRows: number
): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'practice-grid mi-grid';

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'grid-cell mi-grid-cell';
      td.style.width = cellSize + 'mm';
      td.style.height = cellSize + 'mm';
      td.style.borderColor = borderColor;
      td.style.borderWidth = borderWidth + 'px';

      if (showCross) {
        td.appendChild(Object.assign(document.createElement('div'), { className: 'cross-h' }));
        td.appendChild(Object.assign(document.createElement('div'), { className: 'cross-v' }));
      }

      if (showDiagonal) {
        td.appendChild(Object.assign(document.createElement('div'), { className: 'diag-left' }));
        td.appendChild(Object.assign(document.createElement('div'), { className: 'diag-right' }));
      }

      if (guideChar && r < guideFillRows) {
        // Try SVG dashed guide
        const guideCharData = guideChar.length === 1 ? getCharacter(guideChar) : null;
        if (guideCharData && guideCharData.strokes.length > 0) {
          const guideDiv = document.createElement('div');
          guideDiv.className = 'guide-char guide-char-svg';
          guideDiv.innerHTML = generateGuideSVG(guideCharData, 100, Math.min(guideOpacity * 8, 1));
          td.appendChild(guideDiv);
        } else {
          const span = document.createElement('span');
          span.className = 'guide-char';
          span.textContent = guideChar;
          span.style.opacity = String(guideOpacity);
          span.style.fontSize = (cellSize * 0.8) + 'mm';
          td.appendChild(span);
        }
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  return table;
}

function renderCharacterBlock(el: HTMLElement, p: CharacterBlockProps): void {
  el.style.height = 'auto';
  el.innerHTML = '';

  const block = document.createElement('div');
  block.className = 'character-block';

  // Header: character (SVG) + stroke progression (SVG)
  const header = document.createElement('div');
  header.className = 'char-header';

  const mainChar = document.createElement('span');
  mainChar.className = 'char-main';
  // Render main character as SVG if possible
  const charStr = p.character.replace(/\{\{.*?\}\}/g, '').trim();
  const charData = charStr.length === 1 ? getCharacter(charStr) : null;
  if (charData && charData.strokes.length > 0) {
    mainChar.innerHTML = generateCharacterSVG(charData, Math.round(p.charFontSize * 1.5));
  } else {
    mainChar.textContent = p.character;
    mainChar.style.fontSize = p.charFontSize + 'pt';
  }
  header.appendChild(mainChar);

  if (p.showStrokeProgression) {
    const strokes = document.createElement('span');
    strokes.className = 'char-strokes';
    if (charData && charData.strokes.length > 0) {
      const svgs = generateStrokeProgressionSVGs(charData, 36);
      strokes.innerHTML = svgs.join('');
    } else if (p.strokeProgression) {
      strokes.textContent = p.strokeProgression;
    }
    if (strokes.innerHTML || strokes.textContent) {
      header.appendChild(strokes);
    }
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

  // Practice grid — use gridType to decide tian or mi
  const showDiag = p.gridType === 'mi' || (p.gridShowDiagonal ?? false);
  // For guide character in grid, use the raw character (strip template vars)
  const guideCharForGrid = charStr.length === 1 ? charStr : p.character.replace(/\{\{.*?\}\}/g, '').trim();
  block.appendChild(buildCharBlockGrid(
    p.gridRows, p.gridCols, p.gridCellSize,
    p.gridBorderColor, p.gridBorderOpacity ?? 1,
    p.gridCrossColor || '#d4d4d4', p.gridCrossOpacity ?? 1,
    p.gridShowCross, showDiag,
    guideCharForGrid, p.gridGuideOpacity, p.gridGuideFillRows,
    p.gridRowGap ?? 0
  ));

  el.appendChild(block);
}

function buildCharBlockGrid(
  rows: number, cols: number, cellSize: number,
  borderColor: string, borderOpacity: number,
  crossColor: string, crossOpacity: number,
  showCross: boolean, showDiagonal: boolean,
  guideChar: string, guideOpacity: number, guideFillRows: number,
  rowGap: number
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'charblock-grid-wrapper';
  if (rowGap > 0) {
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = rowGap + 'mm';
  }

  // Build rows as separate single-row tables for gap support
  if (rowGap > 0) {
    for (let r = 0; r < rows; r++) {
      const table = document.createElement('table');
      table.className = 'practice-grid charblock-practice-grid';
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = buildCharBlockCell(cellSize, borderColor, borderOpacity, crossColor, crossOpacity, showCross, showDiagonal, guideChar, guideOpacity, r < guideFillRows);
        tr.appendChild(td);
      }
      table.appendChild(tr);
      wrapper.appendChild(table);
    }
  } else {
    const table = document.createElement('table');
    table.className = 'practice-grid charblock-practice-grid';
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = buildCharBlockCell(cellSize, borderColor, borderOpacity, crossColor, crossOpacity, showCross, showDiagonal, guideChar, guideOpacity, r < guideFillRows);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    wrapper.appendChild(table);
  }

  return wrapper;
}

function buildCharBlockCell(
  cellSize: number,
  borderColor: string, borderOpacity: number,
  crossColor: string, crossOpacity: number,
  showCross: boolean, showDiagonal: boolean,
  guideChar: string, guideOpacity: number, showGuide: boolean
): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'grid-cell';
  td.style.width = cellSize + 'mm';
  td.style.height = cellSize + 'mm';
  td.style.borderColor = borderColor;
  td.style.borderWidth = '1px';
  if (borderOpacity < 1) {
    td.style.borderColor = applyOpacity(borderColor, borderOpacity);
  }

  if (showCross) {
    const crossH = document.createElement('div');
    crossH.className = 'cross-h';
    if (crossColor || crossOpacity < 1) {
      crossH.style.borderTopColor = crossOpacity < 1 ? applyOpacity(crossColor || '#d4d4d4', crossOpacity) : crossColor;
    }
    const crossV = document.createElement('div');
    crossV.className = 'cross-v';
    if (crossColor || crossOpacity < 1) {
      crossV.style.borderLeftColor = crossOpacity < 1 ? applyOpacity(crossColor || '#d4d4d4', crossOpacity) : crossColor;
    }
    td.appendChild(crossH);
    td.appendChild(crossV);
  }

  if (showDiagonal) {
    const diagL = document.createElement('div');
    diagL.className = 'diag-left';
    const diagR = document.createElement('div');
    diagR.className = 'diag-right';
    if (crossColor || crossOpacity < 1) {
      const diagColor = crossOpacity < 1 ? applyOpacity(crossColor || '#d4d4d4', crossOpacity) : crossColor;
      diagL.style.background = `linear-gradient(to bottom right, transparent calc(50% - 0.5px), ${diagColor} calc(50% - 0.5px), ${diagColor} calc(50% + 0.5px), transparent calc(50% + 0.5px))`;
      diagR.style.background = `linear-gradient(to bottom left, transparent calc(50% - 0.5px), ${diagColor} calc(50% - 0.5px), ${diagColor} calc(50% + 0.5px), transparent calc(50% + 0.5px))`;
    }
    td.appendChild(diagL);
    td.appendChild(diagR);
  }

  if (guideChar && showGuide) {
    // Try to render SVG dashed guide from character data
    const guideCharData = guideChar.length === 1 ? getCharacter(guideChar) : null;
    if (guideCharData && guideCharData.strokes.length > 0) {
      const guideDiv = document.createElement('div');
      guideDiv.className = 'guide-char guide-char-svg';
      guideDiv.innerHTML = generateGuideSVG(guideCharData, 100, Math.min(guideOpacity * 8, 1));
      td.appendChild(guideDiv);
    } else {
      const span = document.createElement('span');
      span.className = 'guide-char';
      span.textContent = guideChar;
      span.style.opacity = String(guideOpacity);
      span.style.fontSize = (cellSize * 0.8) + 'mm';
      td.appendChild(span);
    }
  }

  return td;
}

/** Apply opacity to a hex color, returning rgba string */
function applyOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
    case 'hanziText':  renderHanziText(el, props as HanziTextProps); break;
    case 'strokeProgression': renderStrokeProgression(el, props as StrokeProgressionProps); break;
    case 'practiceGrid': renderPracticeGrid(el, props as PracticeGridProps); break;
    case 'miGrid':     renderMiGrid(el, props as MiGridProps); break;
    case 'characterBlock': renderCharacterBlock(el, props as CharacterBlockProps); break;
    case 'table':      renderGenericTable(el, props as TableElementProps); break;
    case 'shape':      renderShape(el, props as ShapeElementProps); break;
    case 'image':      renderImage(el, props as ImageElementProps); break;
    case 'callout':    renderCallout(el, props as CalloutElementProps); break;
    case 'divider':    renderDivider(el, props as DividerElementProps); break;
    case 'checklist':  renderChecklist(el, props as ChecklistElementProps); break;
  }
}

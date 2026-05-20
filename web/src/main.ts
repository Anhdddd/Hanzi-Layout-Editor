/**
 * main.ts — Hanzi Layout Editor entry point.
 * Orchestrates all editor functionality.
 */
import Moveable from 'moveable';
import type { AnyElementProps, TextElementProps, ImageElementProps, TableElementProps, EditorState, VariableDescriptor, HanziDataItem, ElementType } from './types.ts';
import {
  getDefaultProps, createElementDOM, updateElementDOM,
  pxToMm, mmToPx
} from './editor/ElementManager.ts';
import { renderPropertyPanel } from './editor/PropertyPanel.ts';
import {
  generatePages, getVariableDescriptors,
  layoutElementsForItemsPerPage, prepareTemplateForDataPreview,
  resolveElementProps
} from './template/TemplateEngine.ts';
import { UndoRedo } from './editor/UndoRedo.ts';
import { requireAuth, isAuthenticated, authFetch } from './auth/auth.ts';
import { downloadPdf } from './pdf/pdfExport.ts';
import { loadCharacters, getCharacter } from './data/characterService.ts';
import sampleData from './data/sampleData.json';
import sampleTemplate from './data/hanziWorkbookTemplate.json';
import tripleTemplate from './data/hanziTriplePracticeTemplate.json';
import minimalTemplate from './data/hanziMinimalTemplate.json';
import flashcardTemplate from './data/hanziFlashcardTemplate.json';
import strokeOrderTemplate from './data/hanziStrokeOrderTemplate.json';
import compactDualTemplate from './data/hanziCompactDualTemplate.json';
import classroomTemplate from './data/hanziClassroomTemplate.json';
import calligraphyTemplate from './data/hanziCalligraphyTemplate.json';

// ─── State ───
const state: EditorState = {
  elements: new Map(),
  selectedId: null,
  dataArray: null,
  dataKeys: [],
  moveable: null,
};

const undoRedo = new UndoRedo(40);

// ─── DOM Refs ───
const page = document.getElementById('a4-page')!;
const panelContent = document.getElementById('panel-content')!;
const canvasArea = document.getElementById('canvas-area')!;
const statusElements = document.getElementById('status-elements')!;
const previewModal = document.getElementById('preview-modal')!;
const previewPages = document.getElementById('preview-pages')!;
const previewCount = document.getElementById('preview-count')!;
const itemsPerPageSelect = document.getElementById('tool-items-per-page') as HTMLSelectElement;
const designDataToggle = document.getElementById('tool-design-data-toggle') as HTMLInputElement;
const templatePresetSelect = document.getElementById('tool-template-preset') as HTMLSelectElement;
const layoutNameInput = document.getElementById('tool-layout-name') as HTMLInputElement;
const charInputModal = document.getElementById('char-input-modal')!;
const charInputTextarea = document.getElementById('char-input-textarea') as HTMLTextAreaElement;
const charInputStatus = document.getElementById('char-input-status')!;
const pageSizeSelect = document.getElementById('tool-page-size') as HTMLSelectElement;

// Track current layout ID (for save/update)
let currentLayoutId: number | null = null;

const templatePresets: Record<string, { template: { elements?: AnyElementProps[] }; itemsPerPage: number }> = {
  elegant: { template: sampleTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 1 },
  triple: { template: tripleTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 3 },
  minimal: { template: minimalTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 1 },
  flashcard: { template: flashcardTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 2 },
  strokeOrder: { template: strokeOrderTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 1 },
  compactDual: { template: compactDualTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 2 },
  classroom: { template: classroomTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 4 },
  calligraphy: { template: calligraphyTemplate as { elements?: AnyElementProps[] }, itemsPerPage: 1 },
};

// ═══════════════════════════════════════════
// Resizable Panels
// ═══════════════════════════════════════════

function setupResizablePanels(): void {
  const sidebar = document.getElementById('sidebar')!;
  const propsPanel = document.getElementById('properties-panel')!;
  const leftHandle = document.getElementById('resize-handle-left')!;
  const rightHandle = document.getElementById('resize-handle-right')!;

  let isResizing = false;
  let currentPanel: HTMLElement | null = null;
  let startX = 0;
  let startWidth = 0;
  let isLeft = false;

  function onMouseDown(e: MouseEvent, panel: HTMLElement, left: boolean): void {
    isResizing = true;
    currentPanel = panel;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    isLeft = left;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent): void {
    if (!isResizing || !currentPanel) return;
    const delta = e.clientX - startX;
    const newWidth = isLeft
      ? Math.max(180, Math.min(500, startWidth + delta))
      : Math.max(200, Math.min(500, startWidth - delta));
    currentPanel.style.width = newWidth + 'px';
  }

  function onMouseUp(): void {
    if (!isResizing) return;
    isResizing = false;
    currentPanel = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, sidebar, true));
  rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, propsPanel, false));
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// ═══════════════════════════════════════════
// Moveable
// ═══════════════════════════════════════════

function initMoveable(): void {
  state.moveable = new Moveable(page, {
    target: null as any,
    container: page,
    draggable: true,
    resizable: true,
    rotatable: false,
    snappable: true,
    snapDirections: { top: true, left: true, bottom: true, right: true, center: true, middle: true },
    elementSnapDirections: { top: true, left: true, bottom: true, right: true, center: true, middle: true },
    snapThreshold: 5,
    origin: false,
    keepRatio: false,
  });

  state.moveable.on('dragStart', ({ target }: any) => {
    if (target.getAttribute('contenteditable') === 'true') return false;
  });

  state.moveable.on('drag', ({ target, left, top }: any) => {
    target.style.left = left + 'px';
    target.style.top = top + 'px';
    const props = state.elements.get(target.id);
    if (props) {
      props.x = pxToMm(left);
      props.y = pxToMm(top);
      refreshPropertyPanel();
    }
  });

  state.moveable.on('dragEnd', () => saveUndoState());

  state.moveable.on('resize', ({ target, width, height, drag }: any) => {
    target.style.width = width + 'px';
    target.style.height = height + 'px';
    target.style.left = drag.left + 'px';
    target.style.top = drag.top + 'px';
    const props = state.elements.get(target.id);
    if (props) {
      props.width = pxToMm(width);
      props.height = pxToMm(height);
      props.x = pxToMm(drag.left);
      props.y = pxToMm(drag.top);
      refreshPropertyPanel();
    }
  });

  state.moveable.on('resizeEnd', () => saveUndoState());
}

// ═══════════════════════════════════════════
// Element CRUD
// ═══════════════════════════════════════════

function isAutoHeightType(type: string, props?: AnyElementProps): boolean {
  if (type === 'practiceGrid' || type === 'miGrid' || type === 'characterBlock') return true;
  if (type === 'table' && props && (props as TableElementProps).autoHeight) return true;
  return false;
}

function addElement(type: ElementType, customProps: Partial<AnyElementProps> = {}): void {
  const props = { ...getDefaultProps(type), ...customProps } as AnyElementProps;
  const count = state.elements.size;
  if (count > 0 && !(customProps as any).x) {
    props.y = 10 + count * 5;
  }

  state.elements.set(props.id, props);
  const dom = createElementDOM(props);

  dom.style.left = mmToPx(props.x) + 'px';
  dom.style.top = mmToPx(props.y) + 'px';
  dom.style.width = mmToPx(props.width) + 'px';
  if (!isAutoHeightType(props.type, props)) {
    dom.style.height = mmToPx(props.height) + 'px';
  }

  attachElementListeners(dom, props);
  page.appendChild(dom);
  selectElement(props.id);
  updateStatusBar();
  saveUndoState();
}

function attachElementListeners(dom: HTMLElement, props: AnyElementProps): void {
  dom.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    selectElement(props.id);
  });

  if (props.type === 'text') {
    dom.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startTextEditing(dom, props as TextElementProps);
    });
  }

  if (props.type === 'table') {
    attachTableCellListeners(dom, props as TableElementProps);
  }
}

function removeElement(id: string): void {
  const dom = document.getElementById(id);
  if (dom) dom.remove();
  state.elements.delete(id);
  if (state.selectedId === id) deselectAll();
  updateStatusBar();
  saveUndoState();
}

function selectElement(id: string): void {
  if (state.selectedId) {
    const prev = document.getElementById(state.selectedId);
    if (prev) prev.classList.remove('selected');
  }
  state.selectedId = id;
  const dom = document.getElementById(id);
  if (dom) {
    dom.classList.add('selected');
    state.moveable.target = dom;
    state.moveable.updateTarget();
  }
  refreshPropertyPanel();
}

function deselectAll(): void {
  if (state.selectedId) {
    const prev = document.getElementById(state.selectedId);
    if (prev) prev.classList.remove('selected');
  }
  state.selectedId = null;
  state.moveable.target = null;
  state.moveable.updateTarget();
  refreshPropertyPanel();
}

function startTextEditing(dom: HTMLElement, props: TextElementProps): void {
  dom.setAttribute('contenteditable', 'true');
  dom.focus();
  state.moveable.draggable = false;
  const finishEdit = () => {
    dom.setAttribute('contenteditable', 'false');
    props.content = dom.innerText;
    state.moveable.draggable = true;
    dom.removeEventListener('blur', finishEdit);
    saveUndoState();
  };
  dom.addEventListener('blur', finishEdit);
}

function attachTableCellListeners(dom: HTMLElement, props: TableElementProps): void {
  dom.addEventListener('dblclick', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.row !== undefined && target.dataset.col !== undefined) {
      e.stopPropagation();
      target.setAttribute('contenteditable', 'true');
      target.focus();
      state.moveable.draggable = false;

      const finishEdit = () => {
        target.setAttribute('contenteditable', 'false');
        target.removeEventListener('blur', finishEdit);
        state.moveable.draggable = true;
        saveUndoState();
      };
      target.addEventListener('blur', finishEdit);
    }
  });

  dom.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('contenteditable') === 'true' && target.dataset.row !== undefined && target.dataset.col !== undefined) {
      const row = parseInt(target.dataset.row);
      const col = parseInt(target.dataset.col);
      if (!props.tableData) props.tableData = [];
      if (!props.tableData[row]) props.tableData[row] = [];
      props.tableData[row][col] = target.textContent || '';
    }
  });
}

// ═══════════════════════════════════════════
// Property Panel
// ═══════════════════════════════════════════

function refreshPropertyPanel(): void {
  const props = state.selectedId ? state.elements.get(state.selectedId) ?? null : null;
  renderPropertyPanel(panelContent, props, (prop: string, value: any) => {
    if (!state.selectedId) return;
    const p = state.elements.get(state.selectedId);
    if (!p) return;
    (p as any)[prop] = value;
    const dom = document.getElementById(state.selectedId);
    if (dom) {
      // If Data View is on, render with resolved data instead of raw {{variables}}
      if (designDataToggle.checked && state.dataArray?.length) {
        const resolved = resolveElementProps(p, state.dataArray[0] as Record<string, unknown>, 0);
        updateElementDOM(dom, { ...resolved, id: p.id } as AnyElementProps);
      } else {
        updateElementDOM(dom, p);
      }
      dom.style.left = mmToPx(p.x) + 'px';
      dom.style.top = mmToPx(p.y) + 'px';
      if (!isAutoHeightType(p.type, p)) {
        dom.style.width = mmToPx(p.width) + 'px';
        dom.style.height = mmToPx(p.height) + 'px';
      }
      state.moveable.updateTarget();
    }
    saveUndoState();
  });

  // Wire "Change Image" button if image element is selected
  if (props && props.type === 'image') {
    const changeBtn = document.getElementById('prop-change-image');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target!.result as string;
            (props as ImageElementProps).src = src;
            const dom = document.getElementById(props.id);
            if (dom) {
              updateElementDOM(dom, props);
              state.moveable.updateTarget();
            }
            saveUndoState();
            refreshPropertyPanel();
          };
          reader.readAsDataURL(file);
        });
        input.click();
      });
    }
  }
}

// ═══════════════════════════════════════════
// Data Management — with rich variable info
// ═══════════════════════════════════════════

function loadData(data: HanziDataItem[]): void {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }
  state.dataArray = data;
  state.dataKeys = getVariableDescriptors(data);

  if (designDataToggle.checked) {
    renderCanvasWithDataPreview();
  }
}

/**
 * Build data array from character input string.
 * Each character is looked up in the characters database.
 */
function buildDataFromCharacters(chars: string): HanziDataItem[] {
  const uniqueChars = [...new Set(chars.replace(/\s+/g, '').split(''))];
  const items: HanziDataItem[] = [];

  for (const ch of uniqueChars) {
    const charData = getCharacter(ch);
    if (charData) {
      items.push({
        character: charData.char,
        pinyin: charData.pinyin || '',
        han_viet: '',
        meaning_vi: charData.vietnamese || '',
        meaning_en: charData.def || '',
        stroke_count: charData.strokeCount,
        stroke_order: [],
        stroke_progression: [],
        radical: charData.radical || '',
        vietnamese_meaning: charData.vietnameseMeaning || '',
      });
    } else {
      // Character not in database, add with minimal info
      items.push({
        character: ch,
        pinyin: '',
        han_viet: '',
        meaning_vi: '',
        meaning_en: '',
        vietnamese_meaning: '',
      });
    }
  }

  return items;
}

function getItemsPerPage(): number {
  return parseInt(itemsPerPageSelect.value, 10) || 1;
}

function getPageSize(): 'A4' | 'A5' {
  return (pageSizeSelect?.value as 'A4' | 'A5') || 'A4';
}

function loadPresetTemplate(key: string): void {
  const preset = templatePresets[key] || templatePresets.elegant;
  loadTemplate(preset.template);
  loadData(sampleData as HanziDataItem[]);
  itemsPerPageSelect.value = String(preset.itemsPerPage);
  if (preset.itemsPerPage > 1) {
    designDataToggle.checked = true;
    renderCanvasWithDataPreview();
  }
}

function getTemplateElementsForOutput(): AnyElementProps[] {
  return layoutElementsForItemsPerPage(Array.from(state.elements.values()), getItemsPerPage());
}

function renderCanvasWithDataPreview(): void {
  // If no data loaded, auto-generate sample from default characters
  if (!state.dataArray?.length) {
    const sampleChars = '你好我';
    const data = buildDataFromCharacters(sampleChars);
    if (data.length > 0) {
      state.dataArray = data as HanziDataItem[];
      state.dataKeys = getVariableDescriptors(data as HanziDataItem[]);
    } else {
      return;
    }
  }
  const templateElements = Array.from(state.elements.values());
  const previewElements = prepareTemplateForDataPreview(templateElements, state.dataArray as Record<string, unknown>[]);
  state.elements.forEach((_, id) => document.getElementById(id)?.remove());
  previewElements.forEach((props, index) => {
    const original = templateElements[index];
    if (!original) return;
    const dom = createElementDOM({ ...props, id: original.id } as AnyElementProps);
    dom.style.left = mmToPx(original.x) + 'px';
    dom.style.top = mmToPx(original.y) + 'px';
    dom.style.width = mmToPx(original.width) + 'px';
    if (!isAutoHeightType(original.type, original)) {
      dom.style.height = mmToPx(original.height) + 'px';
    }
    attachElementListeners(dom, original);
    page.appendChild(dom);
  });
  if (state.selectedId) {
    state.moveable.target = document.getElementById(state.selectedId);
    state.moveable.updateTarget();
  }
}

function renderCanvasTemplateView(): void {
  state.elements.forEach((props, id) => {
    document.getElementById(id)?.remove();
    const dom = createElementDOM(props);
    dom.style.left = mmToPx(props.x) + 'px';
    dom.style.top = mmToPx(props.y) + 'px';
    dom.style.width = mmToPx(props.width) + 'px';
    if (!isAutoHeightType(props.type, props)) {
      dom.style.height = mmToPx(props.height) + 'px';
    }
    attachElementListeners(dom, props);
    page.appendChild(dom);
  });
  if (state.selectedId) {
    state.moveable.target = document.getElementById(state.selectedId);
    state.moveable.updateTarget();
  }
}

function refreshCanvasView(): void {
  if (designDataToggle.checked) renderCanvasWithDataPreview();
  else renderCanvasTemplateView();
}

// ═══════════════════════════════════════════
// Generate / Print
// ═══════════════════════════════════════════

function buildGeneratedPageDOM(target: HTMLElement, preview = false): number {
  const templateElements = getTemplateElementsForOutput();
  if (templateElements.length === 0) {
    alert('No elements on the template.');
    return 0;
  }
  const data = (state.dataArray || []) as Record<string, unknown>[];
  const pages = generatePages(templateElements, data, getItemsPerPage());
  const pageSize = getPageSize();

  target.innerHTML = '';

  if (pageSize === 'A5') {
    // A5 Booklet mode: pair pages onto A4 landscape sheets
    // Original content is designed for A4 (210×297mm)
    // Each A5 half is 148.5×210mm on the A4 landscape sheet
    // Scale factor: A5 width / A4 width = 148.5/210 ≈ 0.707
    // But we also rotate: A5 page height maps to A4 height (210mm)
    // So content designed for 297mm tall needs to fit in 210mm → scale = 210/297 ≈ 0.707
    // Content designed for 210mm wide needs to fit in 148.5mm → scale = 148.5/210 ≈ 0.707
    // Both ratios are the same (√2/2), so uniform scale of ~0.707
    const scale = 148.5 / 210; // ≈ 0.7071

    const totalSheets = Math.ceil(pages.length / 2);
    for (let s = 0; s < totalSheets; s++) {
      const leftPageIdx = s * 2;
      const rightPageIdx = s * 2 + 1;

      const sheetDiv = document.createElement('div');
      sheetDiv.className = preview ? 'preview-page a5-booklet-sheet' : 'print-page a5-booklet-sheet';

      // Left half (first A5 page)
      if (leftPageIdx < pages.length) {
        const leftHalf = document.createElement('div');
        leftHalf.className = 'a5-booklet-half a5-booklet-left';
        const leftContent = document.createElement('div');
        leftContent.className = 'a5-booklet-content';
        leftContent.style.transform = `scale(${scale})`;
        leftContent.style.transformOrigin = 'top left';
        leftContent.style.width = '210mm';
        leftContent.style.height = '297mm';
        leftContent.style.position = 'relative';
        pages[leftPageIdx].elements.forEach(props => {
          const el = createElementDOM(props);
          el.classList.remove('selected');
          el.style.left = props.x + 'mm';
          el.style.top = props.y + 'mm';
          if (!isAutoHeightType(props.type, props)) {
            el.style.width = props.width + 'mm';
            el.style.height = props.height + 'mm';
          }
          leftContent.appendChild(el);
        });
        leftHalf.appendChild(leftContent);
        sheetDiv.appendChild(leftHalf);
      }

      // Right half (second A5 page)
      if (rightPageIdx < pages.length) {
        const rightHalf = document.createElement('div');
        rightHalf.className = 'a5-booklet-half a5-booklet-right';
        const rightContent = document.createElement('div');
        rightContent.className = 'a5-booklet-content';
        rightContent.style.transform = `scale(${scale})`;
        rightContent.style.transformOrigin = 'top left';
        rightContent.style.width = '210mm';
        rightContent.style.height = '297mm';
        rightContent.style.position = 'relative';
        pages[rightPageIdx].elements.forEach(props => {
          const el = createElementDOM(props);
          el.classList.remove('selected');
          el.style.left = props.x + 'mm';
          el.style.top = props.y + 'mm';
          if (!isAutoHeightType(props.type, props)) {
            el.style.width = props.width + 'mm';
            el.style.height = props.height + 'mm';
          }
          rightContent.appendChild(el);
        });
        rightHalf.appendChild(rightContent);
        sheetDiv.appendChild(rightHalf);
      } else {
        // Odd number of pages — add empty right half
        const emptyHalf = document.createElement('div');
        emptyHalf.className = 'a5-booklet-half a5-booklet-right a5-booklet-empty';
        sheetDiv.appendChild(emptyHalf);
      }

      target.appendChild(sheetDiv);
    }
    return totalSheets;
  }

  // Normal A4 mode
  pages.forEach((pg) => {
    const pageDiv = document.createElement('div');
    pageDiv.className = preview ? 'preview-page' : 'print-page';
    pg.elements.forEach(props => {
      const el = createElementDOM(props);
      el.classList.remove('selected');
      el.style.left = props.x + 'mm';
      el.style.top = props.y + 'mm';
      if (!isAutoHeightType(props.type, props)) {
        el.style.width = props.width + 'mm';
        el.style.height = props.height + 'mm';
      }
      pageDiv.appendChild(el);
    });
    target.appendChild(pageDiv);
  });

  return pages.length;
}

// ─── Character Input Modal ───

let pendingAction: 'preview' | 'pdf' = 'preview';

function openCharInputModal(action: 'preview' | 'pdf'): void {
  pendingAction = action;
  charInputModal.classList.add('open');
  charInputModal.setAttribute('aria-hidden', 'false');
  charInputTextarea.focus();
  updateCharInputStatus();
}

function closeCharInputModal(): void {
  charInputModal.classList.remove('open');
  charInputModal.setAttribute('aria-hidden', 'true');
}

function updateCharInputStatus(): void {
  const text = charInputTextarea.value.replace(/\s+/g, '');
  const uniqueChars = [...new Set(text.split(''))];
  const found = uniqueChars.filter(ch => getCharacter(ch) !== null).length;
  charInputStatus.textContent = `${uniqueChars.length} chữ (${found} có trong database)`;
}

function confirmCharInput(): void {
  const text = charInputTextarea.value.trim();
  if (!text) {
    alert('Vui lòng nhập ít nhất 1 chữ.');
    return;
  }

  // Build data from characters
  const data = buildDataFromCharacters(text);
  if (data.length === 0) {
    alert('Không tìm thấy chữ nào hợp lệ.');
    return;
  }

  state.dataArray = data as HanziDataItem[];
  state.dataKeys = getVariableDescriptors(data as HanziDataItem[]);
  closeCharInputModal();

  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    switch (pendingAction) {
      case 'preview':
        doOpenPreview();
        break;
      case 'pdf':
        doDownloadPdf();
        break;
    }
  }, 50);
}

function doOpenPreview(): void {
  const pageSize = getPageSize();
  const pageCount = buildGeneratedPageDOM(previewPages, true);
  if (!pageCount) return;
  const pageSizeInfo = document.getElementById('preview-page-size-info');
  if (pageSize === 'A5') {
    previewCount.textContent = `${pageCount} sheet${pageCount === 1 ? '' : 's'} (${pageCount * 2} A5 pages)`;
    if (pageSizeInfo) pageSizeInfo.textContent = '📐 A5 Booklet → A4 Landscape';
  } else {
    previewCount.textContent = `${pageCount} page${pageCount === 1 ? '' : 's'}`;
    if (pageSizeInfo) pageSizeInfo.textContent = '';
  }
  previewModal.classList.add('open');
  previewModal.setAttribute('aria-hidden', 'false');
}

function openPreview(): void {
  openCharInputModal('preview');
}

function closePreview(): void {
  previewModal.classList.remove('open');
  previewModal.setAttribute('aria-hidden', 'true');
}

// ═══════════════════════════════════════════
// Save / Load Templates
// ═══════════════════════════════════════════

function saveTemplate(): void {
  const template = {
    version: 1,
    pageSize: 'A4',
    elements: Array.from(state.elements.values()),
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hanzi-template-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadTemplate(templateData: { elements?: AnyElementProps[] }): void {
  state.elements.forEach((_, id) => {
    const dom = document.getElementById(id);
    if (dom) dom.remove();
  });
  state.elements.clear();
  deselectAll();

  if (templateData.elements) {
    templateData.elements.forEach(props => {
      state.elements.set(props.id, props);
      const dom = createElementDOM(props);
      dom.style.left = mmToPx(props.x) + 'px';
      dom.style.top = mmToPx(props.y) + 'px';
      if (!isAutoHeightType(props.type, props)) {
        dom.style.width = mmToPx(props.width) + 'px';
        dom.style.height = mmToPx(props.height) + 'px';
      }
      attachElementListeners(dom, props);
      page.appendChild(dom);
    });
  }
  updateStatusBar();
  undoRedo.clear();
  saveUndoState();
}

// ═══════════════════════════════════════════
// Undo / Redo
// ═══════════════════════════════════════════

function saveUndoState(): void {
  undoRedo.push(Array.from(state.elements.values()));
  updateUndoButtons();
}

function performUndo(): void {
  const s = undoRedo.undo();
  if (s) restoreFromSnapshot(s);
}

function performRedo(): void {
  const s = undoRedo.redo();
  if (s) restoreFromSnapshot(s);
}

function restoreFromSnapshot(snapshot: AnyElementProps[]): void {
  state.elements.forEach((_, id) => {
    const dom = document.getElementById(id);
    if (dom) dom.remove();
  });
  state.elements.clear();

  snapshot.forEach(props => {
    state.elements.set(props.id, props);
    const dom = createElementDOM(props);
    dom.style.left = mmToPx(props.x) + 'px';
    dom.style.top = mmToPx(props.y) + 'px';
    if (!isAutoHeightType(props.type, props)) {
      dom.style.width = mmToPx(props.width) + 'px';
      dom.style.height = mmToPx(props.height) + 'px';
    }
    attachElementListeners(dom, props);
    page.appendChild(dom);
  });

  deselectAll();
  updateStatusBar();
  updateUndoButtons();
}

function updateUndoButtons(): void {
  const u = document.getElementById('tool-undo');
  const r = document.getElementById('tool-redo');
  if (u) u.style.opacity = undoRedo.canUndo() ? '1' : '0.3';
  if (r) r.style.opacity = undoRedo.canRedo() ? '1' : '0.3';
}

function updateStatusBar(): void {
  statusElements.textContent = `Elements: ${state.elements.size}`;
}

// ═══════════════════════════════════════════
// Toolbar
// ═══════════════════════════════════════════

function setupToolbar(): void {
  const applyTextProp = (prop: string, value: any) => {
    if (!state.selectedId) return;
    const p = state.elements.get(state.selectedId);
    if (!p || p.type !== 'text') return;
    (p as any)[prop] = value;
    const dom = document.getElementById(state.selectedId);
    if (dom) {
      updateElementDOM(dom, p);
      dom.style.left = mmToPx(p.x) + 'px';
      dom.style.top = mmToPx(p.y) + 'px';
    }
    refreshPropertyPanel();
    saveUndoState();
  };

  const $btn = (id: string) => document.getElementById(id)!;

  $btn('tool-bold').addEventListener('click', () => {
    const p = state.selectedId ? state.elements.get(state.selectedId) : null;
    if (p) applyTextProp('fontWeight', (p as TextElementProps).fontWeight === 'bold' ? 'normal' : 'bold');
  });
  $btn('tool-italic').addEventListener('click', () => {
    const p = state.selectedId ? state.elements.get(state.selectedId) : null;
    if (p) applyTextProp('fontStyle', (p as TextElementProps).fontStyle === 'italic' ? 'normal' : 'italic');
  });
  $btn('tool-underline').addEventListener('click', () => {
    const p = state.selectedId ? state.elements.get(state.selectedId) : null;
    if (p) applyTextProp('textDecoration', (p as TextElementProps).textDecoration === 'underline' ? 'none' : 'underline');
  });

  ($btn('tool-font-family') as HTMLSelectElement).addEventListener('change', (e) =>
    applyTextProp('fontFamily', (e.target as HTMLSelectElement).value)
  );
  ($btn('tool-font-size') as HTMLInputElement).addEventListener('change', (e) =>
    applyTextProp('fontSize', parseInt((e.target as HTMLInputElement).value) || 14)
  );
  ($btn('tool-text-color') as HTMLInputElement).addEventListener('input', (e) =>
    applyTextProp('color', (e.target as HTMLInputElement).value)
  );
  ($btn('tool-bg-color') as HTMLInputElement).addEventListener('input', (e) =>
    applyTextProp('backgroundColor', (e.target as HTMLInputElement).value)
  );

  $btn('tool-align-left').addEventListener('click', () => applyTextProp('textAlign', 'left'));
  $btn('tool-align-center').addEventListener('click', () => applyTextProp('textAlign', 'center'));
  $btn('tool-align-right').addEventListener('click', () => applyTextProp('textAlign', 'right'));

  $btn('tool-undo').addEventListener('click', performUndo);
  $btn('tool-redo').addEventListener('click', performRedo);
  $btn('tool-delete').addEventListener('click', () => {
    if (state.selectedId) removeElement(state.selectedId);
  });

  $btn('tool-save-template').addEventListener('click', saveTemplate);
  $btn('tool-load-sample-template').addEventListener('click', () => {
    loadPresetTemplate(templatePresetSelect.value);
  });
  templatePresetSelect.addEventListener('change', () => loadPresetTemplate(templatePresetSelect.value));
  $btn('tool-load-template').addEventListener('click', () => {
    (document.getElementById('file-template-input') as HTMLInputElement).click();
  });
  (document.getElementById('file-template-input') as HTMLInputElement).addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { loadTemplate(JSON.parse(ev.target!.result as string)); }
      catch (err: any) { alert('Invalid template: ' + err.message); }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  });

  $btn('tool-preview').addEventListener('click', openPreview);
  $btn('preview-close').addEventListener('click', closePreview);
  $btn('preview-print').addEventListener('click', () => {
    closePreview();
    doDownloadPdf();
  });
  itemsPerPageSelect.addEventListener('change', () => {
    if (getItemsPerPage() > 1) {
      designDataToggle.checked = true;
      renderCanvasWithDataPreview();
    }
  });
  designDataToggle.addEventListener('change', refreshCanvasView);
}

// ═══════════════════════════════════════════
// Sidebar
// ═══════════════════════════════════════════

function setupSidebar(): void {
  const $btn = (id: string) => document.getElementById(id)!;

  $btn('add-text-btn').addEventListener('click', () => addElement('text'));
  $btn('add-hanzitext-btn').addEventListener('click', () => addElement('hanziText'));
  $btn('add-strokeprog-btn').addEventListener('click', () => addElement('strokeProgression'));
  $btn('add-grid-btn').addEventListener('click', () => addElement('practiceGrid'));
  $btn('add-migrid-btn').addEventListener('click', () => addElement('miGrid'));
  $btn('add-charblock-btn').addEventListener('click', () => addElement('characterBlock'));
  $btn('add-table-btn').addEventListener('click', () => addElement('table'));
  $btn('add-shape-btn').addEventListener('click', () => addElement('shape'));
  $btn('add-callout-btn').addEventListener('click', () => addElement('callout'));
  $btn('add-divider-btn').addEventListener('click', () => addElement('divider'));
  $btn('add-checklist-btn').addEventListener('click', () => addElement('checklist'));
  $btn('add-image-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target!.result as string;
        addElement('image', { src } as Partial<AnyElementProps>);
      };
      reader.readAsDataURL(file);
    });
    input.click();
  });

  // Double-click on Template Variable items to copy the variable tag
  const variableList = document.getElementById('variable-list');
  if (variableList) {
    variableList.addEventListener('dblclick', (e) => {
      const item = (e.target as HTMLElement).closest('.variable-item') as HTMLElement | null;
      if (!item) return;
      const variableValue = item.getAttribute('data-variable');
      if (!variableValue) return;
      navigator.clipboard.writeText(variableValue).then(() => {
        // Show visual feedback
        item.classList.add('variable-copied');
        const originalDesc = item.querySelector('.variable-desc');
        const originalText = originalDesc?.textContent || '';
        if (originalDesc) originalDesc.textContent = '✓ Đã copy!';
        setTimeout(() => {
          item.classList.remove('variable-copied');
          if (originalDesc) originalDesc.textContent = originalText;
        }, 1200);
      });
    });
  }
}

// ═══════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════

function setupKeyboard(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).getAttribute('contenteditable') === 'true') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
      e.preventDefault();
      removeElement(state.selectedId);
    }
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); }
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); performRedo(); }
    if (e.key === 'Escape') deselectAll();

    if (state.selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const p = state.elements.get(state.selectedId);
      if (!p) return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowUp') p.y -= step;
      if (e.key === 'ArrowDown') p.y += step;
      if (e.key === 'ArrowLeft') p.x -= step;
      if (e.key === 'ArrowRight') p.x += step;
      const dom = document.getElementById(state.selectedId);
      if (dom) {
        dom.style.left = mmToPx(p.x) + 'px';
        dom.style.top = mmToPx(p.y) + 'px';
        state.moveable.updateTarget();
      }
      refreshPropertyPanel();
      saveUndoState();
    }
  });
}

// ═══════════════════════════════════════════
// Cloud Save / Load
// ═══════════════════════════════════════════

async function saveToCloud(): Promise<void> {
  const name = layoutNameInput.value.trim();
  if (!name) {
    alert('Vui lòng nhập tên layout trước khi lưu.');
    layoutNameInput.focus();
    return;
  }

  const templateData = {
    version: 1,
    pageSize: 'A4',
    elements: Array.from(state.elements.values()),
  };

  const body: any = {
    name,
    template_data: templateData,
    items_per_page: getItemsPerPage(),
  };

  if (state.dataArray) {
    body.data_source = state.dataArray;
  }

  try {
    let res: Response;
    if (currentLayoutId) {
      res = await authFetch(`/api/layouts/${currentLayoutId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } else {
      res = await authFetch('/api/layouts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Save failed' }));
      alert('Lưu thất bại: ' + (err.error || 'Unknown error'));
      return;
    }

    const data = await res.json();
    currentLayoutId = data.layout.id;
    // Update URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('id', String(currentLayoutId));
    window.history.replaceState({}, '', url.toString());

    alert('✅ Đã lưu layout thành công!');
  } catch (err: any) {
    alert('Lỗi kết nối: ' + err.message);
  }
}

async function downloadPdfFromEditor(): Promise<void> {
  openCharInputModal('pdf');
}

async function doDownloadPdf(): Promise<void> {
  const templateElements = getTemplateElementsForOutput();
  if (templateElements.length === 0) {
    alert('Không có element nào trên template.');
    return;
  }

  const name = layoutNameInput.value.trim() || 'hanzi-layout';
  const pageSize = getPageSize();

  try {
    const btn = document.getElementById('tool-download-pdf')!;
    btn.textContent = '⏳ Đang tạo...';
    (btn as HTMLButtonElement).disabled = true;

    // Build the pages HTML on the client side (same as preview rendering)
    // This ensures all SVG characters, stroke progressions, grids etc. are rendered correctly
    const tempContainer = document.createElement('div');
    buildGeneratedPageDOM(tempContainer, false);
    const pagesHtml = tempContainer.innerHTML;

    await downloadPdf(pagesHtml, pageSize, `${name}.pdf`);

    btn.textContent = '📥 PDF';
    (btn as HTMLButtonElement).disabled = false;
  } catch (err: any) {
    alert('Tạo PDF thất bại: ' + err.message);
    const btn = document.getElementById('tool-download-pdf')!;
    btn.textContent = '📥 PDF';
    (btn as HTMLButtonElement).disabled = false;
  }
}

async function loadLayoutFromServer(id: number): Promise<void> {
  try {
    const res = await authFetch(`/api/layouts/${id}`);
    if (!res.ok) {
      console.error('Failed to load layout:', res.status);
      return;
    }
    const data = await res.json();
    const layout = data.layout;

    currentLayoutId = layout.id;
    layoutNameInput.value = layout.name || '';

    if (layout.template_data) {
      loadTemplate(layout.template_data);
    }

    if (layout.data_source && Array.isArray(layout.data_source)) {
      loadData(layout.data_source as HanziDataItem[]);
    }

    if (layout.items_per_page) {
      itemsPerPageSelect.value = String(layout.items_per_page);
    }

    console.log(`✓ Loaded layout: ${layout.name} (ID: ${layout.id})`);
  } catch (err: any) {
    console.error('Error loading layout:', err);
  }
}

// ═══════════════════════════════════════════
// Init
// ═══════════════════════════════════════════

function init(): void {
  // Auth guard
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  initMoveable();
  setupResizablePanels();
  setupToolbar();
  setupSidebar();
  setupKeyboard();
  setupCharInputModal();
  page.addEventListener('mousedown', (e) => {
    if (e.target === page) deselectAll();
  });
  updateUndoButtons();
  saveUndoState();

  // Cloud save & PDF download buttons
  document.getElementById('tool-save-cloud')!.addEventListener('click', saveToCloud);
  document.getElementById('tool-download-pdf')!.addEventListener('click', downloadPdfFromEditor);

  // Load characters database
  loadCharacters().then(() => {
    console.log('✓ Characters database loaded');
    const charStatus = document.getElementById('char-db-status');
    if (charStatus) charStatus.textContent = '✓ 3000+ chữ sẵn sàng';
  }).catch(err => {
    console.error('Failed to load characters:', err);
    const charStatus = document.getElementById('char-db-status');
    if (charStatus) charStatus.textContent = '✗ Lỗi tải dữ liệu chữ';
  });

  // Check URL params for layout loading
  const urlParams = new URLSearchParams(window.location.search);
  const layoutId = urlParams.get('id');
  const sampleId = urlParams.get('sample');

  if (layoutId) {
    loadLayoutFromServer(parseInt(layoutId));
  } else if (sampleId) {
    // Load sample as a new layout (don't set currentLayoutId)
    loadLayoutFromServer(parseInt(sampleId)).then(() => {
      currentLayoutId = null; // Reset so it creates new on save
      layoutNameInput.value = layoutNameInput.value ? layoutNameInput.value + ' (Copy)' : '';
    });
  }

  console.log('Hanzi Layout Editor initialized ✓');
}

function setupCharInputModal(): void {
  charInputTextarea.addEventListener('input', updateCharInputStatus);
  document.getElementById('char-input-confirm')!.addEventListener('click', confirmCharInput);
  document.getElementById('char-input-cancel')!.addEventListener('click', closeCharInputModal);

  // Load from .txt file
  const loadTxtBtn = document.getElementById('char-input-load-txt')!;
  const fileInput = document.getElementById('char-input-file') as HTMLInputElement;
  loadTxtBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target!.result as string;
      charInputTextarea.value = text.trim();
      updateCharInputStatus();
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Close on backdrop click
  charInputModal.addEventListener('click', (e) => {
    if (e.target === charInputModal) closeCharInputModal();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

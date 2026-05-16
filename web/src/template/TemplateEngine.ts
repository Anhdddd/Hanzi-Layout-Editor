/**
 * TemplateEngine — handles variable binding and batch page generation.
 */
import type {
  AnyElementProps, GeneratedPage, VariableDescriptor, HanziDataItem
} from '../types.ts';

/** Variable description map — provides human-readable info for known keys */
const KNOWN_DESCRIPTIONS: Record<string, string> = {
  _index:              'Số thứ tự (bắt đầu từ 1)',
  _index0:             'Số thứ tự (bắt đầu từ 0)',
  id:                  'ID của item trong dữ liệu',
  character:           'Ký tự Hán tự (ví dụ: 你)',
  pinyin:              'Phiên âm pinyin (ví dụ: nǐ)',
  han_viet:            'Âm Hán Việt (ví dụ: NỄ)',
  meaning_vi:          'Nghĩa tiếng Việt',
  meaning_en:          'Nghĩa tiếng Anh',
  stroke_count:        'Số nét viết',
  stroke_order:        'Thứ tự các nét viết',
  stroke_decomposition:'Phân tách thành phần bộ thủ',
  stroke_progression:  'Các bước viết dần (ví dụ: 丿→亻→你)',
  radical:             'Bộ thủ chính',
  hsk_level:           'Cấp độ HSK',
  example_word:        'Từ ví dụ',
  example_pinyin:      'Pinyin từ ví dụ',
  example_meaning:     'Nghĩa từ ví dụ',
};

/**
 * Replace {{variable}} placeholders in a string with data values.
 */
export function replaceVariables(template: string, data: Record<string, unknown>, index: number): string {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
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
 * Deep clone element props and replace all string variables.
 */
export function resolveElementProps(
  elementProps: AnyElementProps,
  data: Record<string, unknown>,
  index: number
): AnyElementProps {
  return resolveValue(JSON.parse(JSON.stringify(elementProps)), data, index) as AnyElementProps;
}

function resolveValue(value: unknown, data: Record<string, unknown>, index: number): unknown {
  if (typeof value === 'string') return replaceVariables(value, data, index);
  if (Array.isArray(value)) return value.map(item => resolveValue(item, data, index));
  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      resolved[key] = resolveValue(nestedValue, data, index);
    }
    return resolved;
  }
  return value;
}

/**
 * Generate all pages from template + data array.
 */
export function generatePages(
  templateElements: AnyElementProps[],
  dataArray: Record<string, unknown>[],
  itemsPerPage: number
): GeneratedPage[] {
  const pages: GeneratedPage[] = [];

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
    const pageElements: AnyElementProps[] = [];
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

function getSlotTransform(index: number, itemsPerPage: number): { x: number; y: number } {
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

export function prepareTemplateForDataPreview(
  templateElements: AnyElementProps[],
  dataArray: Record<string, unknown>[]
): AnyElementProps[] {
  const sample = dataArray?.[0];
  if (!sample) return templateElements;
  return templateElements.map(el => resolveElementProps(el, sample, 0));
}

export function layoutElementsForItemsPerPage(
  templateElements: AnyElementProps[],
  itemsPerPage: number
): AnyElementProps[] {
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
    const copy = JSON.parse(JSON.stringify(el)) as AnyElementProps;
    copy.x = pagePadding + (copy.x - bounds.minX) * scale;
    copy.y = pagePadding + (copy.y - bounds.minY) * scale;
    copy.width *= scale;
    copy.height *= scale;
    scaleElementTypography(copy, scale);
    return copy;
  });
}

function getElementBounds(elements: AnyElementProps[]): { minX: number; minY: number; width: number; height: number } | null {
  if (!elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function scaleElementTypography(element: AnyElementProps, scale: number): void {
  const fontProps = ['fontSize', 'charFontSize', 'cellSize', 'gridCellSize', 'lineGap', 'cellPadding'];
  fontProps.forEach(prop => {
    const value = (element as any)[prop];
    if (typeof value === 'number') {
      (element as any)[prop] = Math.max(value * scale, prop === 'fontSize' ? 5 : 1);
    }
  });
}

/**
 * Build variable descriptors from data array — includes descriptions & sample values.
 */
export function getVariableDescriptors(dataArray: HanziDataItem[]): VariableDescriptor[] {
  if (!dataArray || dataArray.length === 0) return [];

  const keys = new Set<string>();
  dataArray.forEach(item => Object.keys(item).forEach(k => keys.add(k)));

  const builtIn: VariableDescriptor[] = [
    {
      key: '_index', displayName: '_index',
      description: KNOWN_DESCRIPTIONS['_index'],
      sampleValue: '1', isArray: false,
    },
    {
      key: '_index0', displayName: '_index0',
      description: KNOWN_DESCRIPTIONS['_index0'],
      sampleValue: '0', isArray: false,
    },
  ];

  const fromData: VariableDescriptor[] = Array.from(keys).map(key => {
    const sample = dataArray[0][key as keyof HanziDataItem];
    const isArr = Array.isArray(sample);
    let sampleStr = '';
    if (isArr) {
      sampleStr = (sample as unknown[]).slice(0, 3).join(' ') + (sample.length > 3 ? '…' : '');
    } else {
      sampleStr = sample != null ? String(sample) : '';
    }
    if (sampleStr.length > 30) sampleStr = sampleStr.substring(0, 30) + '…';

    return {
      key,
      displayName: key,
      description: KNOWN_DESCRIPTIONS[key] || `Field "${key}" from data`,
      sampleValue: sampleStr,
      isArray: isArr,
    };
  });

  return [...builtIn, ...fromData];
}

/**
 * Check if a string contains template variables.
 */
export function hasVariables(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return /\{\{\w+\}\}/.test(str);
}

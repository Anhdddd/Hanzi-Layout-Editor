/**
 * PropertyPanel — renders property controls for the selected element.
 * Dynamically generates form fields based on element type.
 */
import type {
  AnyElementProps, TextElementProps, PracticeGridProps,
  MiGridProps, HanziTextProps, StrokeProgressionProps, CharacterBlockProps, TableElementProps, ShapeElementProps,
  ImageElementProps, CalloutElementProps, DividerElementProps,
  ChecklistElementProps
} from '../types.ts';

type PropChangeCallback = (prop: string, value: any) => void;

export function renderPropertyPanel(
  panelContent: HTMLElement,
  props: AnyElementProps | null,
  onChange: PropChangeCallback
): void {
  if (!props) {
    panelContent.innerHTML = '<div class="panel-empty"><p>Select an element to see properties</p></div>';
    return;
  }

  let html = '';
  html += `<div style="margin-bottom:4px"><span class="prop-badge">${props.type}</span></div>`;

  // Position — shared by all
  html += `
    <div class="prop-group">
      <div class="prop-group-title">Position</div>
      <div class="prop-row">
        <span class="prop-label">X</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="x" value="${r(props.x)}" step="0.5" />
        <span class="prop-label">Y</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="y" value="${r(props.y)}" step="0.5" />
      </div>
      <div class="prop-row">
        <span class="prop-label">W</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="width" value="${r(props.width)}" step="0.5" />
        <span class="prop-label">H</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="height" value="${r(props.height)}" step="0.5" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Z</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="zIndex" value="${props.zIndex}" step="1" min="0" />
      </div>
    </div>`;

  // Type-specific
  switch (props.type) {
    case 'text':           html += textProps(props); break;
    case 'hanziText':      html += hanziTextProps(props as HanziTextProps); break;
    case 'strokeProgression': html += strokeProgressionProps(props as StrokeProgressionProps); break;
    case 'practiceGrid':   html += gridProps(props); break;
    case 'miGrid':         html += miGridProps(props); break;
    case 'characterBlock': html += charBlockProps(props); break;
    case 'table':          html += tableProps(props); break;
    case 'shape':          html += shapeProps(props); break;
    case 'image':          html += imageProps(props); break;
    case 'callout':        html += calloutProps(props); break;
    case 'divider':        html += dividerProps(props); break;
    case 'checklist':      html += checklistProps(props); break;
  }

  panelContent.innerHTML = html;

  // Bind events
  panelContent.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-prop]').forEach(input => {
    const evtType = (input as HTMLInputElement).type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(evtType, (e) => {
      const target = e.target as HTMLInputElement;
      const prop = target.dataset.prop!;
      let value: any = target.type === 'checkbox' ? target.checked
        : target.type === 'number' ? (parseFloat(target.value) || 0)
        : target.value;
      onChange(prop, value);
    });
  });
}

// ─── Type-specific renderers ───

function textProps(p: TextElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Text Content</div>
      <textarea class="prop-textarea" data-prop="content" style="min-height:80px">${esc(p.content)}</textarea>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Font</div>
      <div class="prop-row">
        <span class="prop-label">Font</span>
        <select class="prop-select" data-prop="fontFamily">
          ${fontOpt(p.fontFamily, 'LXGW WenKai')}
          ${fontOpt(p.fontFamily, 'Noto Sans SC')}
          ${fontOpt(p.fontFamily, 'Noto Serif SC')}
          ${fontOpt(p.fontFamily, 'Inter')}
          ${fontOpt(p.fontFamily, 'Arial')}
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="fontSize" value="${p.fontSize}" min="6" max="200" />
        <span class="prop-label">pt</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="color" value="${p.color}" />
        <span class="prop-label">Bg</span>
        <input type="color" class="prop-color" data-prop="backgroundColor" value="${p.backgroundColor === 'transparent' ? '#ffffff' : p.backgroundColor}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Align</span>
        <select class="prop-select" data-prop="textAlign">
          <option value="left" ${p.textAlign === 'left' ? 'selected' : ''}>Left</option>
          <option value="center" ${p.textAlign === 'center' ? 'selected' : ''}>Center</option>
          <option value="right" ${p.textAlign === 'right' ? 'selected' : ''}>Right</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Weight</span>
        <select class="prop-select" data-prop="fontWeight">
          <option value="normal" ${p.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="bold" ${p.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
          <option value="300" ${p.fontWeight === '300' ? 'selected' : ''}>Light</option>
          <option value="700" ${p.fontWeight === '700' ? 'selected' : ''}>700</option>
          <option value="900" ${p.fontWeight === '900' ? 'selected' : ''}>900</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Line H</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="lineHeight" value="${p.lineHeight}" min="0.8" max="3" step="0.1" />
      </div>
    </div>`;
}

function hanziTextProps(p: HanziTextProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Hanzi Content</div>
      <textarea class="prop-textarea" data-prop="content" placeholder="Nhập chữ Hán tự..." style="min-height:80px;font-size:18px;letter-spacing:2px">${esc(p.content)}</textarea>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Display</div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="charSize" value="${p.charSize}" min="8" max="120" />
        <span class="prop-label">pt</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Gap</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="charGap" value="${p.charGap}" min="0" max="20" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="color" value="${p.color}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Line H</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="lineHeight" value="${p.lineHeight}" min="0.8" max="3" step="0.1" />
      </div>
    </div>`;
}

function strokeProgressionProps(p: StrokeProgressionProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Character</div>
      <div class="prop-row">
        <span class="prop-label">Char</span>
        <input type="text" class="prop-input" data-prop="character" value="${esc(p.character)}" placeholder="你 or {{character}}" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Step Display</div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="stepSize" value="${p.stepSize}" min="8" max="80" />
        <span class="prop-label">pt</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Gap</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="stepGap" value="${p.stepGap}" min="0" max="20" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Colors</div>
      <div class="prop-row">
        <span class="prop-label">Done</span>
        <input type="color" class="prop-color" data-prop="completedColor" value="${p.completedColor}" />
        <span class="prop-label">Active</span>
        <input type="color" class="prop-color" data-prop="activeColor" value="${p.activeColor}" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Full Character</div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showFullCharFirst" ${p.showFullCharFirst ? 'checked' : ''} />
          <span>Show full char first</span>
        </label>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="fullCharColor" value="${p.fullCharColor}" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Step Numbers</div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showStepNumbers" ${p.showStepNumbers ? 'checked' : ''} />
          <span>Show numbers</span>
        </label>
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="numberFontSize" value="${p.numberFontSize}" min="5" max="24" />
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="numberColor" value="${p.numberColor}" />
      </div>
    </div>`;
}

function gridProps(p: PracticeGridProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Grid Settings</div>
      <div class="prop-row">
        <span class="prop-label">Rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="rows" value="${p.rows}" min="1" max="20" />
        <span class="prop-label">Cols</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="cols" value="${p.cols}" min="1" max="20" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Cell</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="cellSize" value="${p.cellSize}" min="5" max="40" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showCrossLines" ${p.showCrossLines ? 'checked' : ''} />
          <span>Show cross lines (田字格)</span>
        </label>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Guide Character</div>
      <div class="prop-row">
        <span class="prop-label">Char</span>
        <input type="text" class="prop-input" data-prop="guideCharacter" value="${esc(p.guideCharacter)}" placeholder="e.g. 你 or {{character}}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Opacity</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="guideOpacity" value="${p.guideOpacity}" min="0.01" max="0.5" step="0.01" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Fill rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="guideFillRows" value="${p.guideFillRows}" min="0" max="20" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Border</div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
      </div>
    </div>`;
}

function miGridProps(p: MiGridProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">米字格 Settings</div>
      <div class="prop-row">
        <span class="prop-label">Rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="rows" value="${p.rows}" min="1" max="20" />
        <span class="prop-label">Cols</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="cols" value="${p.cols}" min="1" max="20" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Cell</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="cellSize" value="${p.cellSize}" min="5" max="40" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showCrossLines" ${p.showCrossLines ? 'checked' : ''} />
          <span>Cross lines (十)</span>
        </label>
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showDiagonalLines" ${p.showDiagonalLines ? 'checked' : ''} />
          <span>Diagonal lines (✕)</span>
        </label>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Guide Character</div>
      <div class="prop-row">
        <span class="prop-label">Char</span>
        <input type="text" class="prop-input" data-prop="guideCharacter" value="${esc(p.guideCharacter)}" placeholder="e.g. 你 or {{character}}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Opacity</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="guideOpacity" value="${p.guideOpacity}" min="0.01" max="0.5" step="0.01" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Fill rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="guideFillRows" value="${p.guideFillRows}" min="0" max="20" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Border</div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
      </div>
    </div>`;
}

function charBlockProps(p: CharacterBlockProps): string {
  // No maxlength limits — user can type template variables freely
  return `
    <div class="prop-group">
      <div class="prop-group-title">Character</div>
      <div class="prop-row">
        <span class="prop-label">Char</span>
        <input type="text" class="prop-input" data-prop="character" value="${esc(p.character)}" placeholder="你 or {{character}}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="charFontSize" value="${p.charFontSize}" min="12" max="120" />
        <span class="prop-label">pt</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Pinyin</span>
        <input type="text" class="prop-input" data-prop="pinyin" value="${esc(p.pinyin)}" placeholder="nǐ or {{pinyin}}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">HV</span>
        <input type="text" class="prop-input" data-prop="hanViet" value="${esc(p.hanViet)}" placeholder="NỄ or {{han_viet}}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Mean</span>
        <input type="text" class="prop-input" data-prop="meaningVi" value="${esc(p.meaningVi)}" placeholder="{{meaning_vi}}" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Stroke Progression</div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="showStrokeProgression" ${p.showStrokeProgression ? 'checked' : ''} />
          <span>Show stroke progression</span>
        </label>
      </div>
      <textarea class="prop-textarea" data-prop="strokeProgression" placeholder="{{stroke_progression}}" style="min-height:36px">${esc(p.strokeProgression)}</textarea>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Practice Grid</div>
      <div class="prop-row">
        <span class="prop-label">Type</span>
        <select class="prop-select" data-prop="gridType">
          <option value="tian" ${p.gridType === 'tian' ? 'selected' : ''}>田字格 (Cross)</option>
          <option value="mi" ${p.gridType === 'mi' ? 'selected' : ''}>米字格 (Cross + Diagonal)</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridRows" value="${p.gridRows}" min="1" max="10" />
        <span class="prop-label">Cols</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridCols" value="${p.gridCols}" min="1" max="15" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Cell</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridCellSize" value="${p.gridCellSize}" min="5" max="30" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Row gap</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridRowGap" value="${p.gridRowGap}" min="0" max="10" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="gridShowCross" ${p.gridShowCross ? 'checked' : ''} />
          <span>Cross lines (十)</span>
        </label>
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="gridShowDiagonal" ${p.gridShowDiagonal ? 'checked' : ''} />
          <span>Diagonal lines (✕)</span>
        </label>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Grid Border</div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="gridBorderColor" value="${p.gridBorderColor}" />
        <span class="prop-label">Opacity</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridBorderOpacity" value="${p.gridBorderOpacity}" min="0" max="1" step="0.05" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Grid Lines (Cross/Diagonal)</div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="gridCrossColor" value="${p.gridCrossColor}" />
        <span class="prop-label">Opacity</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridCrossOpacity" value="${p.gridCrossOpacity}" min="0" max="1" step="0.05" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Guide Character</div>
      <div class="prop-row">
        <span class="prop-label">Guide</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridGuideOpacity" value="${p.gridGuideOpacity}" min="0" max="0.5" step="0.01" />
        <span class="prop-label">opacity</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Fill</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="gridGuideFillRows" value="${p.gridGuideFillRows}" min="0" max="10" />
        <span class="prop-label">rows</span>
      </div>
    </div>`;
}

function tableProps(p: TableElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Table Structure</div>
      <div class="prop-row">
        <span class="prop-label">Rows</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="tableRows" value="${p.tableRows}" min="1" max="30" />
        <span class="prop-label">Cols</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="tableCols" value="${p.tableCols}" min="1" max="15" />
      </div>
      <div class="prop-row">
        <label class="prop-checkbox">
          <input type="checkbox" data-prop="autoHeight" ${p.autoHeight ? 'checked' : ''} />
          <span>Auto height</span>
        </label>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Typography</div>
      <div class="prop-row">
        <span class="prop-label">Font</span>
        <select class="prop-select" data-prop="fontFamily">
          ${fontOpt(p.fontFamily, 'LXGW WenKai')}
          ${fontOpt(p.fontFamily, 'Noto Sans SC')}
          ${fontOpt(p.fontFamily, 'Noto Serif SC')}
          ${fontOpt(p.fontFamily, 'Inter')}
          ${fontOpt(p.fontFamily, 'Arial')}
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="fontSize" value="${p.fontSize}" min="6" max="48" />
        <span class="prop-label">pt</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <input type="color" class="prop-color" data-prop="fontColor" value="${p.fontColor || '#000000'}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Pad</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="cellPadding" value="${p.cellPadding}" min="0" max="10" step="0.5" />
        <span class="prop-label">mm</span>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Colors</div>
      <div class="prop-row">
        <span class="prop-label">Border</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Header</span>
        <input type="color" class="prop-color" data-prop="headerBg" value="${p.headerBg}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Cell Bg</span>
        <input type="color" class="prop-color" data-prop="cellBg" value="${p.cellBg || '#ffffff'}" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title" style="font-style:italic;color:#9ca0af">Double-click a cell to edit. Drag table from any non-editing state.</div>
    </div>`;
}

function shapeProps(p: ShapeElementProps): string {
  const showCorners = p.shapeType === 'rectangle' || p.shapeType === 'roundedRect';
  return `
    <div class="prop-group">
      <div class="prop-group-title">Shape</div>
      <div class="prop-row">
        <span class="prop-label">Type</span>
        <select class="prop-select" data-prop="shapeType">
          <option value="rectangle" ${p.shapeType === 'rectangle' ? 'selected' : ''}>Rectangle</option>
          <option value="roundedRect" ${p.shapeType === 'roundedRect' ? 'selected' : ''}>Rounded Rect</option>
          <option value="circle" ${p.shapeType === 'circle' ? 'selected' : ''}>Circle</option>
          <option value="ellipse" ${p.shapeType === 'ellipse' ? 'selected' : ''}>Ellipse</option>
          <option value="line" ${p.shapeType === 'line' ? 'selected' : ''}>Line</option>
        </select>
      </div>
      ${showCorners ? `
      <div class="prop-group-title" style="margin-top:8px">Border Radius (px)</div>
      <div class="prop-row">
        <span class="prop-label">TL</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadiusTL" value="${p.borderRadiusTL}" min="0" max="200" />
        <span class="prop-label">TR</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadiusTR" value="${p.borderRadiusTR}" min="0" max="200" />
      </div>
      <div class="prop-row">
        <span class="prop-label">BL</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadiusBL" value="${p.borderRadiusBL}" min="0" max="200" />
        <span class="prop-label">BR</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadiusBR" value="${p.borderRadiusBR}" min="0" max="200" />
      </div>` : ''}
      <div class="prop-row">
        <span class="prop-label">Border</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
        <input type="number" class="prop-input prop-input-sm" data-prop="borderWidth" value="${p.borderWidth}" min="0" max="10" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Bg</span>
        <input type="color" class="prop-color" data-prop="backgroundColor" value="${p.backgroundColor === 'transparent' ? '#ffffff' : p.backgroundColor}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Style</span>
        <select class="prop-select" data-prop="borderStyle">
          <option value="solid" ${p.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
          <option value="dashed" ${p.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
          <option value="dotted" ${p.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
          <option value="double" ${p.borderStyle === 'double' ? 'selected' : ''}>Double</option>
        </select>
      </div>
    </div>`;
}

function imageProps(p: ImageElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Image</div>
      <div class="prop-row">
        <button class="sidebar-action-btn" id="prop-change-image" style="width:100%">Change Image</button>
      </div>
      <div class="prop-row">
        <span class="prop-label">Fit</span>
        <select class="prop-select" data-prop="objectFit">
          <option value="contain" ${p.objectFit === 'contain' ? 'selected' : ''}>Contain</option>
          <option value="cover" ${p.objectFit === 'cover' ? 'selected' : ''}>Cover</option>
          <option value="fill" ${p.objectFit === 'fill' ? 'selected' : ''}>Fill</option>
          <option value="none" ${p.objectFit === 'none' ? 'selected' : ''}>None</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Opacity</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="opacity" value="${p.opacity}" min="0" max="1" step="0.05" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Radius</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadius" value="${p.borderRadius}" min="0" max="200" />
        <span class="prop-label">px</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">Border</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
        <input type="number" class="prop-input prop-input-sm" data-prop="borderWidth" value="${p.borderWidth}" min="0" max="10" />
      </div>
    </div>`;
}

function calloutProps(p: CalloutElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Callout Content</div>
      <div class="prop-row">
        <span class="prop-label">Icon</span>
        <input type="text" class="prop-input prop-input-sm" data-prop="icon" value="${esc(p.icon)}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Title</span>
        <input type="text" class="prop-input" data-prop="title" value="${esc(p.title)}" />
      </div>
      <textarea class="prop-textarea" data-prop="body" style="min-height:64px">${esc(p.body)}</textarea>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Style</div>
      <div class="prop-row">
        <span class="prop-label">Accent</span>
        <input type="color" class="prop-color" data-prop="accentColor" value="${p.accentColor}" />
        <span class="prop-label">Text</span>
        <input type="color" class="prop-color" data-prop="color" value="${p.color}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Bg</span>
        <input type="color" class="prop-color" data-prop="backgroundColor" value="${p.backgroundColor}" />
        <span class="prop-label">Border</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Font</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="fontSize" value="${p.fontSize}" min="6" max="48" />
        <span class="prop-label">Radius</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="borderRadius" value="${p.borderRadius}" min="0" max="80" />
      </div>
    </div>`;
}

function dividerProps(p: DividerElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Divider</div>
      <div class="prop-row">
        <span class="prop-label">Label</span>
        <input type="text" class="prop-input" data-prop="label" value="${esc(p.label)}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Ornament</span>
        <select class="prop-select" data-prop="ornament">
          <option value="none" ${p.ornament === 'none' ? 'selected' : ''}>None</option>
          <option value="dot" ${p.ornament === 'dot' ? 'selected' : ''}>Dot</option>
          <option value="diamond" ${p.ornament === 'diamond' ? 'selected' : ''}>Diamond</option>
          <option value="hanzi" ${p.ornament === 'hanzi' ? 'selected' : ''}>Hanzi</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Line</span>
        <input type="color" class="prop-color" data-prop="lineColor" value="${p.lineColor}" />
        <input type="number" class="prop-input prop-input-sm" data-prop="lineWidth" value="${p.lineWidth}" min="0" max="8" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Style</span>
        <select class="prop-select" data-prop="lineStyle">
          <option value="solid" ${p.lineStyle === 'solid' ? 'selected' : ''}>Solid</option>
          <option value="dashed" ${p.lineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
          <option value="dotted" ${p.lineStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
          <option value="double" ${p.lineStyle === 'double' ? 'selected' : ''}>Double</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Text</span>
        <input type="color" class="prop-color" data-prop="color" value="${p.color}" />
        <input type="number" class="prop-input prop-input-sm" data-prop="fontSize" value="${p.fontSize}" min="6" max="36" />
      </div>
    </div>`;
}

function checklistProps(p: ChecklistElementProps): string {
  return `
    <div class="prop-group">
      <div class="prop-group-title">Checklist</div>
      <div class="prop-row">
        <span class="prop-label">Title</span>
        <input type="text" class="prop-input" data-prop="title" value="${esc(p.title)}" />
      </div>
      <textarea class="prop-textarea" data-prop="items" style="min-height:88px">${esc(p.items)}</textarea>
      <div class="prop-row">
        <span class="prop-label">Box</span>
        <select class="prop-select" data-prop="boxStyle">
          <option value="square" ${p.boxStyle === 'square' ? 'selected' : ''}>Square</option>
          <option value="circle" ${p.boxStyle === 'circle' ? 'selected' : ''}>Circle</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Check</span>
        <input type="text" class="prop-input prop-input-sm" data-prop="checkedSymbol" value="${esc(p.checkedSymbol)}" placeholder="✓" />
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title">Style</div>
      <div class="prop-row">
        <span class="prop-label">Accent</span>
        <input type="color" class="prop-color" data-prop="accentColor" value="${p.accentColor}" />
        <span class="prop-label">Text</span>
        <input type="color" class="prop-color" data-prop="color" value="${p.color}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Border</span>
        <input type="color" class="prop-color" data-prop="borderColor" value="${p.borderColor}" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Font</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="fontSize" value="${p.fontSize}" min="6" max="36" />
        <span class="prop-label">Gap</span>
        <input type="number" class="prop-input prop-input-sm" data-prop="lineGap" value="${p.lineGap}" min="0" max="10" step="0.5" />
      </div>
    </div>`;
}

// ─── Helpers ───

function r(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function fontOpt(current: string, name: string): string {
  return `<option value="${name}" ${current === name ? 'selected' : ''}>${name}</option>`;
}

function esc(str: string | undefined): string {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Core type definitions for the Hanzi Layout Editor.
 */

// ─── Element Types ───

export type ElementType = 'text' | 'hanziText' | 'strokeProgression' | 'practiceGrid' | 'miGrid' | 'characterBlock' | 'table' | 'shape' | 'image' | 'callout' | 'divider' | 'checklist';

export type ObjectFit = 'contain' | 'cover' | 'fill' | 'none';

export type ShapeVariant = 'rectangle' | 'line' | 'circle' | 'ellipse' | 'roundedRect';

export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export type TextAlign = 'left' | 'center' | 'right';

export type FontWeight = 'normal' | 'bold' | '300' | '500' | '700' | '900';

/** Base properties shared by all elements */
export interface BaseElementProps {
  id: string;
  type: ElementType;
  x: number;      // mm from left
  y: number;      // mm from top
  width: number;   // mm
  height: number;  // mm
  rotation: number;
  zIndex: number;
  locked: boolean;
}

/** Text element */
export interface TextElementProps extends BaseElementProps {
  type: 'text';
  content: string;
  fontSize: number;       // pt
  fontFamily: string;
  fontWeight: FontWeight;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  backgroundColor: string;
  textAlign: TextAlign;
  lineHeight: number;
}

/** Hanzi Text element — renders Chinese characters as SVG */
export interface HanziTextProps extends BaseElementProps {
  type: 'hanziText';
  content: string;         // Chinese characters (e.g. "你好世界")
  charSize: number;        // pt — size of each character SVG
  charGap: number;         // mm — gap between characters
  color: string;           // fallback text color when SVG not available
  lineHeight: number;
}

/** Stroke Progression element — shows step-by-step stroke order */
export interface StrokeProgressionProps extends BaseElementProps {
  type: 'strokeProgression';
  character: string;           // single character or {{character}}
  stepSize: number;            // pt — size of each step SVG
  stepGap: number;             // mm — gap between steps
  completedColor: string;      // color for completed strokes
  activeColor: string;         // color for the current (active) stroke
  showStepNumbers: boolean;    // show step number below each SVG
  numberFontSize: number;      // pt — font size for step numbers
  numberColor: string;         // color for step numbers
  showFullCharFirst: boolean;  // show full character as first item
  fullCharColor: string;       // color for the full character
}

/** Practice grid element (田字格) */
export interface PracticeGridProps extends BaseElementProps {
  type: 'practiceGrid';
  rows: number;
  cols: number;
  cellSize: number;        // mm
  borderColor: string;
  borderWidth: number;
  showCrossLines: boolean;
  guideCharacter: string;
  guideOpacity: number;
  guideFillRows: number;
  guideFontSize: number;
}

/** Mi Grid element (米字格) — practice grid with cross + diagonal lines */
export interface MiGridProps extends BaseElementProps {
  type: 'miGrid';
  rows: number;
  cols: number;
  cellSize: number;        // mm
  borderColor: string;
  borderWidth: number;
  showCrossLines: boolean;
  showDiagonalLines: boolean;
  guideCharacter: string;
  guideOpacity: number;
  guideFillRows: number;
  guideFontSize: number;
}

/** Character block — compound element with char + info + grid */
export interface CharacterBlockProps extends BaseElementProps {
  type: 'characterBlock';
  character: string;
  pinyin: string;
  hanViet: string;
  meaningVi: string;
  strokeProgression: string;
  showStrokeProgression: boolean;
  charFontSize: number;    // pt
  gridType: 'tian' | 'mi';  // 田字格 or 米字格
  gridRows: number;
  gridCols: number;
  gridCellSize: number;    // mm
  gridBorderColor: string;
  gridBorderOpacity: number;  // 0–1
  gridCrossColor: string;
  gridCrossOpacity: number;   // 0–1
  gridShowCross: boolean;
  gridShowDiagonal: boolean;
  gridGuideOpacity: number;
  gridGuideFillRows: number;
  gridRowGap: number;      // mm — gap between rows
}

/** Generic table */
export interface TableElementProps extends BaseElementProps {
  type: 'table';
  tableRows: number;
  tableCols: number;
  tableData: string[][];
  headerBg: string;
  borderColor: string;
  cellPadding: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  cellBg: string;
  autoHeight: boolean;
}

/** Shape element (rectangle, circle, line, etc.) */
export interface ShapeElementProps extends BaseElementProps {
  type: 'shape';
  shapeType: ShapeVariant;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
  borderStyle: BorderStyle;
  borderRadiusTL: number;  // px, top-left
  borderRadiusTR: number;  // px, top-right
  borderRadiusBR: number;  // px, bottom-right
  borderRadiusBL: number;  // px, bottom-left
}

/** Image element */
export interface ImageElementProps extends BaseElementProps {
  type: 'image';
  src: string;           // data URL or object URL
  objectFit: ObjectFit;
  opacity: number;       // 0–1
  borderRadius: number;  // px
  borderColor: string;
  borderWidth: number;
}

/** Callout / note box element */
export interface CalloutElementProps extends BaseElementProps {
  type: 'callout';
  title: string;
  body: string;
  icon: string;
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  borderRadius: number;
}

/** Decorative divider element */
export interface DividerElementProps extends BaseElementProps {
  type: 'divider';
  label: string;
  lineColor: string;
  lineWidth: number;
  lineStyle: BorderStyle;
  ornament: 'none' | 'dot' | 'diamond' | 'hanzi';
  fontSize: number;
  color: string;
}

/** Checklist / task list element */
export interface ChecklistElementProps extends BaseElementProps {
  type: 'checklist';
  title: string;
  items: string;
  boxStyle: 'square' | 'circle';
  checkedSymbol: string;
  borderColor: string;
  accentColor: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  lineGap: number;
}

/** Union of all element prop types */
export type AnyElementProps =
  | TextElementProps
  | HanziTextProps
  | StrokeProgressionProps
  | PracticeGridProps
  | MiGridProps
  | CharacterBlockProps
  | TableElementProps
  | ShapeElementProps
  | ImageElementProps
  | CalloutElementProps
  | DividerElementProps
  | ChecklistElementProps;

// ─── Data Types ───

/** A single Hanzi data entry */
export interface HanziDataItem {
  id?: number;
  character: string;
  pinyin: string;
  han_viet?: string;
  meaning_vi?: string;
  meaning_en?: string;
  stroke_count?: number;
  stroke_order?: string[];
  stroke_decomposition?: string[];
  stroke_progression?: string[];
  radical?: string;
  hsk_level?: number;
  example_word?: string;
  example_pinyin?: string;
  example_meaning?: string;
  [key: string]: unknown;  // allow extra fields
}

// ─── Template Types ───

/** Saved template file format */
export interface TemplateFile {
  version: number;
  pageSize: string;
  elements: AnyElementProps[];
}

/** A generated page */
export interface GeneratedPage {
  pageNum: number;
  elements: AnyElementProps[];
}

// ─── Variable Descriptor ───

/** Describes a template variable with preview value */
export interface VariableDescriptor {
  key: string;
  displayName: string;
  description: string;
  sampleValue: string;
  isArray: boolean;
}

// ─── Editor State ───

export interface EditorState {
  elements: Map<string, AnyElementProps>;
  selectedId: string | null;
  dataArray: HanziDataItem[] | null;
  dataKeys: VariableDescriptor[];
  moveable: any;   // Moveable instance
}

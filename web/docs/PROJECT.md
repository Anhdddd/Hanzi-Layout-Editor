# Hanzi Layout Editor — Project Documentation

> Tài liệu kỹ thuật dành cho AI Agent và developer. Cập nhật lần cuối: 2026-05-16.

---

## 1. Tổng quan dự án

**Hanzi Layout Editor** là một web-based visual editor để thiết kế bố cục vở/sách luyện viết chữ Hán tự. Người dùng có thể:

- Kéo thả các element (text, bảng luyện viết, khối chữ Hán tự, hình khối…) lên trang A4
- Tùy chỉnh properties (font, màu, kích thước, border…) qua panel bên phải
- Gắn biến template `{{variable}}` vào các field → batch generate nhiều trang từ dữ liệu JSON
- Export template (JSON) và in PDF qua `window.print()`
- Chạy hoàn toàn local, không cần server

**Mục đích kinh doanh:** Tạo ra nhiều bộ sách/vở luyện viết Hán tự khác nhau một cách nhanh chóng, sau đó in hàng loạt để bán.

---

## 2. Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Build tool | **Vite** v8 |
| Ngôn ngữ | **TypeScript** (strict mode) |
| UI Framework | Vanilla HTML/CSS/TS (không dùng React/Vue) |
| Kéo thả / Resize | **Moveable.js** v0.53+ |
| Multi-select | **Selecto.js** v1.26+ (đã cài, chưa tích hợp) |
| Fonts | Google Fonts: Inter, Noto Sans SC, Noto Serif SC |
| In ấn | CSS `@page` + `window.print()` |
| Lưu trữ | Export/Import JSON file (không có database) |

---

## 3. Cấu trúc thư mục

```
toolsLayout/
├── index.html                      ← Entry point HTML, cấu trúc DOM chính
├── package.json                    ← Dependencies & scripts
├── tsconfig.json                   ← TypeScript configuration
│
├── src/
│   ├── main.ts                     ← ★ Entry point JS — orchestrator chính
│   ├── types.ts                    ← ★ Định nghĩa types cho toàn bộ project
│   │
│   ├── editor/
│   │   ├── ElementManager.ts       ← Quản lý CRUD & DOM rendering element
│   │   ├── PropertyPanel.ts        ← Render property form cho element đang chọn
│   │   └── UndoRedo.ts             ← Stack-based undo/redo
│   │
│   ├── template/
│   │   └── TemplateEngine.ts       ← Variable binding & batch page generation
│   │
│   ├── data/
│   │   └── sampleData.json         ← 10 từ Hán tự HSK1 mẫu
│   │
│   ├── styles/
│   │   ├── index.css               ← Design system (CSS variables, reset)
│   │   ├── editor.css              ← Layout editor (flex, resize handles)
│   │   ├── page.css                ← A4 page, grid cells, character block
│   │   ├── toolbar.css             ← Top toolbar
│   │   ├── sidebar.css             ← Left sidebar + variable list
│   │   ├── properties.css          ← Right properties panel
│   │   └── print.css               ← @page rules cho in PDF
│   │
│   └── assets/                     ← (trống, dành cho assets tương lai)
│
└── docs/
    └── PROJECT.md                  ← File này
```

---

## 4. Kiến trúc & Data Flow

### 4.1. Cấu trúc DOM chính

```
#app
├── #toolbar                        ← Header: format tools, save/load, generate
├── .editor-main                    ← Flex row chứa 3 panels
│   ├── #sidebar                    ← Panel trái: add elements, data source, variables
│   ├── .resize-handle-left         ← Drag handle resize sidebar
│   ├── #canvas-area                ← Vùng giữa: scroll + A4 page
│   │   └── .canvas-scroll
│   │       └── .a4-page-wrapper
│   │           └── #a4-page        ← ★ Container cho tất cả page-elements
│   ├── .resize-handle-right        ← Drag handle resize properties
│   └── #properties-panel           ← Panel phải: thuộc tính element đang chọn
└── #print-container                ← Hidden container, dùng khi Generate/Print
```

### 4.2. Data Flow

```
┌──────────────────────────────────────────────────────┐
│                    EditorState                        │
│  elements: Map<id, AnyElementProps>                  │
│  selectedId: string | null                           │
│  dataArray: HanziDataItem[] | null                   │
│  dataKeys: VariableDescriptor[]                      │
│  moveable: Moveable instance                         │
└───────────┬──────────────────────────┬───────────────┘
            │                          │
    ┌───────▼───────┐          ┌──────▼──────┐
    │  DOM Render    │          │  Property   │
    │  (a4-page)     │◄────────│   Panel     │
    │                │  update  │  (right)    │
    └───────┬───────┘          └──────┬──────┘
            │                          │
    ┌───────▼───────┐          ┌──────▼──────┐
    │  Moveable.js   │          │  UndoRedo   │
    │  (drag/resize) │          │  (history)  │
    └───────────────┘          └─────────────┘
```

**Luồng chính:**
1. User click "Add Element" → `addElement(type)` → tạo props via `getDefaultProps()` → lưu vào `state.elements` → render DOM via `createElementDOM()` → append vào `#a4-page`
2. User click element → `selectElement(id)` → `Moveable.target = dom` → `renderPropertyPanel()` hiển thị form
3. User thay đổi property → callback `onChange(prop, value)` → update props → `updateElementDOM()` re-render → `Moveable.updateTarget()`
4. User drag/resize → Moveable events → update `props.x/y/width/height` (px→mm) → sync property panel
5. Mỗi thao tác → `saveUndoState()` → push snapshot vào history

---

## 5. Hệ thống Element Types

Tất cả element types được định nghĩa trong `src/types.ts`.

### 5.1. Base Properties (chung cho mọi element)

| Prop | Type | Đơn vị | Mô tả |
|---|---|---|---|
| `id` | string | — | ID duy nhất, format `el_{timestamp}_{counter}` |
| `type` | ElementType | — | `'text' \| 'practiceGrid' \| 'characterBlock' \| 'table' \| 'shape'` |
| `x`, `y` | number | mm | Vị trí tuyệt đối trong A4 page |
| `width`, `height` | number | mm | Kích thước |
| `rotation` | number | deg | Góc xoay |
| `zIndex` | number | — | Thứ tự z-layer |
| `locked` | boolean | — | Khóa element (chưa implement UI) |

### 5.2. Element Types Chi Tiết

#### `text` — Text Element
- **Chức năng:** Khung text tự do, double-click để edit inline
- **Props đặc trưng:** `content`, `fontSize` (pt), `fontFamily`, `fontWeight`, `fontStyle`, `textDecoration`, `color`, `backgroundColor`, `textAlign`, `lineHeight`
- **Render:** `el.innerText = content`, apply inline styles

#### `practiceGrid` — Bảng ô luyện viết (田字格)
- **Chức năng:** Grid NxM ô vuông với đường chéo dashed (cross lines)
- **Props đặc trưng:** `rows`, `cols`, `cellSize` (mm), `showCrossLines`, `guideCharacter`, `guideOpacity`, `guideFillRows`
- **Render:** `<table class="practice-grid">` với `<td class="grid-cell">`, cross-lines là pseudo `<div>` positioned absolute
- **Auto-height:** Width/height tự tính từ `cols * cellSize` / `rows * cellSize`

#### `characterBlock` — Khối Hán tự tổng hợp
- **Chức năng:** Element phức hợp gồm: chữ chính + stroke progression + pinyin/HV/meaning + practice grid bên dưới
- **Props đặc trưng:** `character`, `pinyin`, `hanViet`, `meaningVi`, `strokeProgression`, `showStrokeProgression`, `charFontSize`, `gridRows`, `gridCols`, `gridCellSize`, `gridShowCross`, `gridGuideOpacity`, `gridGuideFillRows`
- **Render:** Tạo DOM hierarchy: `.character-block > .char-header + .char-info + table.practice-grid`
- **Auto-height:** Yes

#### `table` — Bảng dữ liệu
- **Chức năng:** Bảng NxM generic, hàng đầu là header
- **Props đặc trưng:** `tableRows`, `tableCols`, `tableData[][]`, `headerBg`, `borderColor`, `cellPadding`, `fontSize`, `fontFamily`
- **Auto-height:** Yes

#### `shape` — Hình khối
- **Chức năng:** Các hình cơ bản: rectangle, roundedRect, circle, ellipse, line
- **Props đặc trưng:** `shapeType` (ShapeVariant), `borderColor`, `borderWidth`, `backgroundColor`, `borderStyle` (solid/dashed/dotted/double), `borderRadius`
- **Render:** Apply `border-radius: 50%` cho circle/ellipse, custom `borderRadius` cho roundedRect, `height: 0` cho line

---

## 6. Hệ thống Đơn vị (Units)

**Quan trọng:** Dự án sử dụng **mm (millimeters)** làm đơn vị chính cho element positioning/sizing để đảm bảo khi in ra giấy A4 thì chính xác.

- **State (props):** Luôn lưu bằng mm
- **DOM rendering (screen):** Chuyển mm → px bằng `mmToPx()` (1mm ≈ 3.7795px at 96 DPI)
- **Print rendering:** Dùng trực tiếp mm (`el.style.left = props.x + 'mm'`)
- **Moveable events:** Trả về px → convert qua `pxToMm()` trước khi lưu

```typescript
export const MM_TO_PX = 3.7795275591;
export function mmToPx(mm: number): number { return mm * MM_TO_PX; }
export function pxToMm(px: number): number { return px / MM_TO_PX; }
```

---

## 7. Template Engine & Variable System

### 7.1. Cú pháp biến
Sử dụng `{{variable_name}}` trong bất kỳ string property nào. Ví dụ:
- `character` field → `{{character}}` → sẽ được thay bằng `你`, `好`, `我`...
- `content` của text element → `Bài {{_index}}: {{character}} — {{meaning_vi}}`

### 7.2. Biến đặc biệt
| Biến | Mô tả |
|---|---|
| `{{_index}}` | Số thứ tự bắt đầu từ 1 |
| `{{_index0}}` | Số thứ tự bắt đầu từ 0 |

### 7.3. Batch Generation
Khi nhấn "Generate":
1. `generatePages(templateElements, dataArray, itemsPerPage)` được gọi
2. Mỗi data item → 1 trang (khi `itemsPerPage = 0`)
3. Mỗi trang: clone template elements → `resolveElementProps()` thay thế tất cả `{{var}}` bằng data thực
4. Render vào `#print-container` → `window.print()`

### 7.4. Variable Descriptors
Khi load data, `getVariableDescriptors()` tạo ra mảng `VariableDescriptor[]` chứa:
- `key`: tên biến
- `description`: mô tả tiếng Việt (từ `KNOWN_DESCRIPTIONS` map)
- `sampleValue`: giá trị mẫu từ item đầu tiên
- `isArray`: có phải mảng không (sẽ được join bằng space)

---

## 8. Dữ liệu Hán tự (Sample Data)

File `src/data/sampleData.json` chứa 10 từ HSK1. Schema:

```typescript
interface HanziDataItem {
  id: number;
  character: string;           // "你"
  pinyin: string;              // "nǐ"
  han_viet: string;            // "NỄ"
  meaning_vi: string;          // "bạn, anh, chị"
  meaning_en: string;          // "you"
  stroke_count: number;        // 7
  stroke_order: string[];      // ["丿", "丨", ...]
  stroke_progression: string[];// ["丿", "𠆢", "亻", ..., "你"]
  radical: string;             // "亻"
  hsk_level: number;           // 1
  example_word: string;        // "你好"
  example_pinyin: string;      // "nǐ hǎo"
  example_meaning: string;     // "xin chào"
}
```

Người dùng có thể import JSON file riêng với schema tùy ý — hệ thống tự detect tất cả keys.

---

## 9. CSS Architecture

### 9.1. Design Tokens (`index.css`)
Tất cả colors, fonts, spacing, radius được khai báo qua CSS custom properties trong `:root`. Khi cần thay đổi theme, chỉ sửa file này.

**Key variables:**
- `--color-bg`, `--color-bg-elevated`, `--color-bg-surface` — background layers
- `--color-primary` (`#6366f1`) — accent color (indigo)
- `--color-border`, `--color-border-light` — borders
- `--font-ui` — Inter (UI text)
- `--font-chinese` — Noto Sans SC (Chinese text)
- `--sidebar-width` (`240px`), `--panel-width` (`260px`) — panel sizes

### 9.2. File phân chia
| File | Trách nhiệm |
|---|---|
| `index.css` | Variables, reset, scrollbar, Moveable overrides |
| `editor.css` | Flex layout 3 columns, resize handles |
| `page.css` | A4 page, `.page-element`, `.practice-grid`, `.character-block`, `.generic-table`, `.shape-*` |
| `toolbar.css` | Top toolbar buttons, selects, color pickers |
| `sidebar.css` | Sidebar sections, add buttons, data preview, variable cards |
| `properties.css` | Right panel form: `.prop-group`, `.prop-row`, `.prop-input`, `.prop-checkbox` |
| `print.css` | `@media print` rules: ẩn editor, hiển thị `#print-container`, `@page { size: A4 }` |

---

## 10. Moveable.js Integration

### Cấu hình
```typescript
new Moveable(page, {        // parentElement = page (render controls inside page)
  container: page,           // coordinate reference = page
  draggable: true,
  resizable: true,
  snappable: true,           // snap to edges/centers of other elements
  snapThreshold: 5,          // px
});
```

### Lưu ý quan trọng
- Moveable **phải render controls bên trong `#a4-page`** (cùng coordinate space với elements). Nếu render ở `canvasArea` sẽ bị lệch handles.
- Khi element thay đổi props → cần gọi `moveable.updateTarget()` để sync handles.
- Một số element types (`practiceGrid`, `characterBlock`, `table`) có **auto-height** — không set `dom.style.height` bằng px mà để auto.

---

## 11. Undo/Redo

- Stack-based, tối đa 40 levels
- Mỗi snapshot = deep clone toàn bộ `state.elements.values()`
- Khi undo/redo: xóa tất cả DOM elements → re-render từ snapshot
- Trigger: sau mỗi addElement, removeElement, property change, drag/resize end

---

## 12. Keyboard Shortcuts

| Phím | Chức năng |
|---|---|
| `Delete` / `Backspace` | Xóa element đang chọn |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Escape` | Bỏ chọn element |
| `Arrow keys` | Di chuyển element 1mm |
| `Shift + Arrow keys` | Di chuyển element 5mm |
| `Double-click` text | Bật chế độ edit inline |

---

## 13. Resizable Panels

Sidebar (trái) và Properties Panel (phải) có thể kéo thả để thay đổi độ rộng:
- Handle elements: `#resize-handle-left`, `#resize-handle-right`
- Min width: sidebar 180px, properties 200px
- Max width: 500px
- Logic: `setupResizablePanels()` trong `main.ts`

---

## 14. Quy ước code khi thêm tính năng mới

### Thêm element type mới
1. Thêm type vào `ElementType` union trong `types.ts`
2. Tạo interface `NewElementProps extends BaseElementProps` trong `types.ts`
3. Thêm vào `AnyElementProps` union
4. Thêm case trong `getDefaultProps()` ở `ElementManager.ts`
5. Tạo hàm `renderNewElement()` trong `ElementManager.ts`
6. Thêm case trong `createElementDOM()` và `updateElementDOM()`
7. Thêm hàm `newElementProps()` trong `PropertyPanel.ts`
8. Thêm button vào sidebar trong `index.html`
9. Thêm event listener trong `setupSidebar()` ở `main.ts`
10. Thêm CSS styles trong `page.css`

### Thêm property cho element hiện có
1. Thêm field vào interface tương ứng trong `types.ts`
2. Set default value trong `getDefaultProps()`
3. Thêm input field trong hàm `xxxProps()` của `PropertyPanel.ts`
4. Xử lý trong hàm `renderXxx()` của `ElementManager.ts`

### Thêm template variable mới
1. Thêm field vào `HanziDataItem` trong `types.ts`
2. Thêm mô tả vào `KNOWN_DESCRIPTIONS` trong `TemplateEngine.ts`
3. Thêm data vào `sampleData.json`

---

## 15. Known Issues & TODOs

- [ ] **Selecto.js** đã cài nhưng chưa tích hợp (multi-select elements)
- [ ] **Image element** — button có nhưng chưa implement
- [ ] **locked** property — có trong type nhưng chưa có UI
- [ ] **Table cell editing** — chưa hỗ trợ edit nội dung từng cell
- [ ] **Zoom** — hiển thị 100% cố định, chưa có zoom in/out
- [ ] **Copy/Paste elements** — chưa implement
- [ ] **Snap guidelines** — Moveable snapping hoạt động nhưng chưa có visual guides
- [ ] **A4 page padding** — hiện tại page có `padding: 10mm`, elements positioned absolute bên trong

---

## 16. Lệnh thường dùng

```bash
# Chạy dev server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

Dev server mặc định: `http://localhost:5173/`

# Hanzi Layout Editor — Project Documentation

> Tài liệu kỹ thuật dành cho AI Agent và developer. Cập nhật lần cuối: 2026-05-20.

---

## 1. Tổng quan dự án

**Hanzi Layout Editor** là một web-based visual editor để thiết kế bố cục vở/sách luyện viết chữ Hán tự. Người dùng có thể:

- Kéo thả các element (text, SVG chữ Hán, bảng luyện viết 田字格/米字格, stroke progression, khối chữ Hán tự, hình khối…) lên trang A4
- Tùy chỉnh properties (font, màu, kích thước, border, opacity…) qua panel bên phải
- Gắn biến template `{{variable}}` vào các field → batch generate nhiều trang từ dữ liệu character database
- Nhập danh sách chữ cần in (gõ tay hoặc load file .txt) → hệ thống tự tra cứu database 3000+ chữ
- Hiển thị chữ Hán dạng SVG (stroke data), stroke progression (thứ tự nét), guide character (nét đứt để tô)
- Export template (JSON), lưu lên server, preview và tải PDF
- Hệ thống auth (login/register) + cloud save layouts

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
| Fonts | LXGW WenKai (mặc định), Inter, Noto Sans SC, Noto Serif SC |
| In ấn | CSS `@page` + `window.print()` |
| PDF | Server-side generation via `/api/pdf/generate` |
| Lưu trữ | PostgreSQL (server) + Export/Import JSON file |
| Auth | JWT token-based (bcrypt password hash) |
| Server | Express.js + PostgreSQL |

---

## 3. Cấu trúc thư mục

```
toolsLayout/
├── server/                         ← Backend Express.js
│   ├── src/
│   │   ├── index.js                ← Server entry point
│   │   ├── config/
│   │   │   ├── database.js         ← PostgreSQL pool
│   │   │   └── init.js             ← DB table creation + seed admin
│   │   ├── middleware/
│   │   │   └── auth.js             ← JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js             ← Login/Register endpoints
│   │   │   ├── layouts.js          ← CRUD layouts API
│   │   │   └── pdf.js              ← PDF generation endpoint
│   │   ├── services/
│   │   │   └── pdfService.js       ← PDF rendering logic
│   │   ├── seed.js                 ← Seed sample layouts into DB
│   │   └── data/
│   │       ├── characters.json     ← 3000+ chữ Hán (stroke SVG data)
│   │       └── chiettu.json        ← Chiết tự + nghĩa Việt ngắn gọn
│   └── package.json
│
├── web/                            ← Frontend Vite + TypeScript
│   ├── index.html                  ← Editor page
│   ├── dashboard.html              ← Layout management page
│   ├── login.html                  ← Auth page
│   ├── public/
│   │   ├── characters.json         ← Copy of stroke data (served static, ~24MB)
│   │   ├── chiettu.json            ← Copy of chiết tự data (served static)
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── main.ts                 ← ★ Editor entry point — orchestrator chính
│   │   ├── dashboard.ts            ← Dashboard page logic
│   │   ├── login.ts                ← Login page logic
│   │   ├── types.ts                ← ★ Định nghĩa types cho toàn bộ project
│   │   ├── auth/
│   │   │   └── auth.ts             ← Auth utilities (token, fetch wrapper)
│   │   ├── data/
│   │   │   ├── characterService.ts ← ★ Load & query character/chiettu data
│   │   │   ├── sampleData.json     ← 10 từ HSK1 mẫu (legacy)
│   │   │   ├── hanziWorkbookTemplate.json
│   │   │   ├── hanziTriplePracticeTemplate.json
│   │   │   ├── hanziMinimalTemplate.json
│   │   │   ├── hanziFlashcardTemplate.json
│   │   │   ├── hanziStrokeOrderTemplate.json
│   │   │   └── hanziCompactDualTemplate.json
│   │   ├── editor/
│   │   │   ├── ElementManager.ts   ← ★ CRUD & DOM rendering tất cả elements
│   │   │   ├── PropertyPanel.ts    ← Render property form cho element đang chọn
│   │   │   └── UndoRedo.ts         ← Stack-based undo/redo
│   │   ├── template/
│   │   │   └── TemplateEngine.ts   ← Variable binding & batch page generation
│   │   ├── pdf/
│   │   │   └── pdfExport.ts        ← Client-side PDF download logic
│   │   └── styles/
│   │       ├── index.css            ← Design system + @font-face LXGW WenKai
│   │       ├── editor.css           ← Layout + char input modal
│   │       ├── page.css             ← A4 page, elements, grids, SVG styles
│   │       ├── toolbar.css
│   │       ├── sidebar.css
│   │       ├── properties.css
│   │       ├── print.css
│   │       ├── dashboard.css
│   │       └── login.css
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── deploy.sh
└── .gitignore
```

---

## 4. Kiến trúc & Data Flow

### 4.1. Character Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  /public/characters.json (24MB)     /public/chiettu.json        │
│  ┌─────────────────────────┐        ┌──────────────────────┐   │
│  │ 3034 characters         │        │ 3086 entries         │   │
│  │ • strokes[] (SVG paths) │        │ • vietnamese_meaning │   │
│  │ • medians[][]           │        │ • breakdown[]        │   │
│  │ • pinyin                │        │ • compounds[]        │   │
│  │ • vietnamese (full)     │        └──────────────────────┘   │
│  │ • strokeCount           │                                    │
│  │ • radical, def          │                                    │
│  └─────────────────────────┘                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ fetch() on init
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  characterService.ts                                            │
│  • loadCharacters() → merge both files into CharacterMap        │
│  • getCharacter(char) → CharacterData | null                    │
│  • generateCharacterSVG(data, size, color)                      │
│  • generateStrokeProgressionSVGs(data, size)                    │
│  • generateGuideSVG(data, size, opacity)                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Editor Data Flow

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

### 4.3. Preview/Print Flow

```
User clicks Preview/PDF/Print
        │
        ▼
┌─────────────────────────┐
│  Character Input Modal   │
│  • Nhập tay chữ Hán     │
│  • Hoặc load file .txt  │
└───────────┬─────────────┘
            │ confirmCharInput()
            ▼
┌─────────────────────────┐
│  buildDataFromCharacters │  ← Tra cứu từng chữ trong characterService
│  → HanziDataItem[]       │     (pinyin, meaning, radical, stroke_count,
│                           │      vietnamese_meaning)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  generatePages()         │  ← TemplateEngine resolve {{variables}}
│  → GeneratedPage[]       │     cho từng data item
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  createElementDOM()      │  ← Render SVG characters, stroke progression,
│  → Print/Preview pages   │     guide characters (dashed), grids, etc.
└─────────────────────────┘
```

---

## 5. Hệ thống Element Types

Tất cả element types được định nghĩa trong `src/types.ts`.

### 5.1. Base Properties (chung cho mọi element)

| Prop | Type | Đơn vị | Mô tả |
|---|---|---|---|
| `id` | string | — | ID duy nhất, format `el_{timestamp}_{counter}` |
| `type` | ElementType | — | Loại element |
| `x`, `y` | number | mm | Vị trí tuyệt đối trong A4 page |
| `width`, `height` | number | mm | Kích thước |
| `rotation` | number | deg | Góc xoay |
| `zIndex` | number | — | Thứ tự z-layer |
| `locked` | boolean | — | Khóa element |

### 5.2. Element Types

| Type | Mô tả | Auto-height |
|---|---|---|
| `text` | Khung text tự do, double-click edit inline | No |
| `hanziText` | Nhập chữ Hán → render SVG từng ký tự | No |
| `strokeProgression` | Hiển thị từng bước viết nét (SVG) | No |
| `practiceGrid` | Bảng ô luyện viết 田字格 (cross lines) | Yes |
| `miGrid` | Bảng ô luyện viết 米字格 (cross + diagonal) | Yes |
| `characterBlock` | Khối tổng hợp: SVG chữ + stroke progression + info + grid | Yes |
| `table` | Bảng NxM generic | Optional |
| `shape` | Hình khối: rectangle, circle, ellipse, line, roundedRect | No |
| `image` | Hình ảnh (data URL) | No |
| `callout` | Hộp ghi chú có icon + accent color | No |
| `divider` | Đường phân cách có label + ornament | No |
| `checklist` | Danh sách checkbox | No |

### 5.3. Chi tiết Element mới

#### `hanziText` — Chữ Hán dạng SVG
- **Chức năng:** Nhập chuỗi chữ Hán → mỗi ký tự render thành SVG từ stroke data
- **Props:** `content`, `charSize` (pt), `charGap` (mm), `color`, `lineHeight`
- **Behavior:** Nếu content là template variable `{{character}}`, hiển thị placeholder text. Khi resolve → render SVG.
- **Fallback:** Chữ không có trong DB → render text thường

#### `strokeProgression` — Thứ tự nét viết
- **Chức năng:** Hiển thị từng bước viết nét của 1 chữ, nét hiện tại bôi đỏ
- **Props:** `character`, `stepSize` (pt), `stepGap` (mm), `completedColor`, `activeColor`, `showStepNumbers`, `numberFontSize`, `numberColor`, `showFullCharFirst`, `fullCharColor`
- **Behavior:** Mỗi step = 1 SVG với tất cả nét đã viết (đen) + nét đang viết (đỏ)

#### `miGrid` — Lưới 米字格
- **Chức năng:** Grid NxM ô vuông với đường chữ thập + 2 đường chéo (8 phần)
- **Props:** Giống `practiceGrid` + `showDiagonalLines`
- **Guide character:** Render SVG dạng nét đứt (dashed outline, fill trắng) từ stroke data

#### `characterBlock` — Khối Hán tự tổng hợp (cập nhật)
- **Grid type:** Chọn `tian` (田字格) hoặc `mi` (米字格)
- **Grid border:** Tùy chỉnh `gridBorderColor`, `gridBorderOpacity`
- **Grid lines:** Tùy chỉnh `gridCrossColor`, `gridCrossOpacity`, `gridShowDiagonal`
- **Row gap:** `gridRowGap` (mm) — khoảng cách giữa các hàng
- **Main character:** Render SVG (không phải text)
- **Stroke progression:** Render SVG với nét đỏ/đen
- **Guide character:** SVG nét đứt (dashed) trong ô luyện viết

---

## 6. Character Data Format

### 6.1. characters.json (stroke data)

```typescript
interface CharacterData {
  char: string;           // "你"
  def: string;            // "you" (English definition)
  decomp: string;         // "⿰亻尔" (decomposition)
  radical: string;        // "亻"
  etymology: string;      // JSON string with type + hint
  strokes: string[];      // SVG path data (closed shapes, viewBox 0 0 1024 1024)
  medians: number[][][];  // Median points per stroke
  matches: number[][];    // Component matching data
  strokeCount: number;    // 7
  pinyin: string;         // "nǐ"
  vietnamese: string;     // Full Vietnamese meaning (long)
  vietnameseMeaning: string; // Short Vietnamese meaning from chiettu.json
}
```

**Lưu ý SVG:**
- Hệ tọa độ: Y-up (Y=0 ở dưới) → cần `transform="scale(1,-1) translate(0,-900)"` khi render
- Paths là closed shapes (kết thúc bằng Z) → dùng `fill` để tô, không phải `stroke`
- ViewBox: `0 0 1024 1024`

### 6.2. chiettu.json (chiết tự)

```typescript
interface ChietTuItem {
  word: string;               // "爱"
  pinyin: string;             // "ài"
  vietnamese_meaning: string; // "yêu, tình yêu" (ngắn gọn)
  breakdown: [{
    character: string;
    components: [{ radical: string; meaning: string }];
    mnemonic: string;
  }];
  compounds: unknown[];
}
```

---

## 7. Template Variables

Sử dụng `{{variable_name}}` trong bất kỳ string property nào.

| Biến | Nguồn | Mô tả |
|---|---|---|
| `{{character}}` | characters.json | Chữ Hán tự |
| `{{pinyin}}` | characters.json | Phiên âm pinyin |
| `{{meaning_vi}}` | characters.json `.vietnamese` | Nghĩa tiếng Việt (đầy đủ, dài) |
| `{{vietnamese_meaning}}` | chiettu.json | Nghĩa tiếng Việt (ngắn gọn) |
| `{{meaning_en}}` | characters.json `.def` | Nghĩa tiếng Anh |
| `{{radical}}` | characters.json | Bộ thủ |
| `{{stroke_count}}` | characters.json | Số nét |
| `{{_index}}` | auto | Số thứ tự (bắt đầu từ 1) |
| `{{_index0}}` | auto | Số thứ tự (bắt đầu từ 0) |

### Batch Generation Flow
1. User nhập chữ (gõ tay hoặc load .txt) trong Character Input Modal
2. `buildDataFromCharacters()` tra cứu từng chữ trong `characterService`
3. `generatePages()` clone template elements → `resolveElementProps()` thay `{{var}}` bằng data thực
4. `createElementDOM()` render SVG cho mỗi element đã resolve

---

## 8. SVG Rendering

### 8.1. Character SVG (`generateCharacterSVG`)
- Fill đặc, 1 màu (configurable)
- Transform: `scale(1,-1) translate(0,-900)`

### 8.2. Stroke Progression SVG (`generateStrokeProgressionSVGs`)
- Mỗi step: nét đã viết = `completedColor`, nét đang viết = `activeColor`
- Transform: `scale(1,-1) translate(0,-900)`

### 8.3. Guide SVG (`generateGuideSVG`)
- Fill trắng (`#ffffff`) + stroke đen dashed (`stroke-dasharray="20 12"`, `stroke-width="14"`)
- Opacity giảm dần theo thứ tự nét (gợi ý thứ tự viết)
- Transform: `scale(1,-1) translate(0,-900)`
- Dùng trong grid cells để user tô theo bằng bút

---

## 9. Font System

### Font mặc định: LXGW WenKai
- File: `src/assets/LXGWWenKai-Medium.ttf` (~24MB)
- Khai báo: `@font-face` trong `index.css`
- CSS variable: `--font-chinese: 'LXGW WenKai', 'Noto Sans SC', ...`
- Tất cả element mặc định dùng font này

### Font options trong editor:
- LXGW WenKai (mặc định)
- Noto Sans SC
- Noto Serif SC
- Inter
- Arial

---

## 10. CSS Architecture

### Design Tokens (`index.css`)
- `--color-bg`, `--color-bg-elevated`, `--color-bg-surface` — background layers
- `--color-primary` (`#6366f1`) — accent color (indigo)
- `--font-ui` — Inter (UI text)
- `--font-chinese` — LXGW WenKai (Chinese text on page)
- `--grid-border`, `--grid-cross` — grid line colors

### File phân chia
| File | Trách nhiệm |
|---|---|
| `index.css` | Variables, reset, @font-face, Moveable overrides |
| `editor.css` | Flex layout, resize handles, char input modal |
| `page.css` | A4 page, all element types, SVG styles, grid cells |
| `toolbar.css` | Top toolbar |
| `sidebar.css` | Left sidebar |
| `properties.css` | Right properties panel |
| `print.css` | @media print rules |
| `dashboard.css` | Dashboard page |
| `login.css` | Login page |

---

## 11. API Endpoints

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, name}` | `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` | `{token, user}` |

### Layouts (requires auth)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/layouts` | — | `{layouts[]}` (user's + samples) |
| GET | `/api/layouts/samples` | — | `{layouts[]}` (samples only) |
| GET | `/api/layouts/:id` | — | `{layout}` (full data) |
| POST | `/api/layouts` | `{name, template_data, ...}` | `{layout}` |
| PUT | `/api/layouts/:id` | `{name?, template_data?, ...}` | `{layout}` |
| DELETE | `/api/layouts/:id` | — | `{message}` |

### PDF
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/pdf/generate` | `{templateElements, dataArray, itemsPerPage}` | PDF blob |

---

## 12. Template Presets

| Key | Name | Items/Page | Mô tả |
|---|---|---|---|
| `elegant` | Elegant Workbook | 1 | Trang nhã, đầy đủ thông tin |
| `triple` | 3 Words Practice | 3 | 3 từ/trang, tối ưu không gian |
| `minimal` | Minimal | 1 | Tối giản, tập trung ô viết |
| `flashcard` | Flashcard | 2 | Thẻ flashcard 2/trang |
| `strokeOrder` | Stroke Order Focus | 1 | Tập trung thứ tự nét + 米字格 |
| `compactDual` | Compact Dual | 2 | 2 chữ/trang gọn gàng |

---

## 13. Đơn vị (Units)

- **State (props):** mm (millimeters)
- **DOM rendering (screen):** mm → px (`1mm ≈ 3.7795px` at 96 DPI)
- **Print rendering:** Dùng trực tiếp mm
- **Moveable events:** px → convert qua `pxToMm()` trước khi lưu

---

## 14. Keyboard Shortcuts

| Phím | Chức năng |
|---|---|
| `Delete` / `Backspace` | Xóa element đang chọn |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Escape` | Bỏ chọn element |
| `Arrow keys` | Di chuyển element 1mm |
| `Shift + Arrow keys` | Di chuyển element 5mm |
| `Double-click` text | Bật chế độ edit inline |
| `Double-click` table cell | Edit nội dung cell |

---

## 15. Quy ước code khi thêm tính năng mới

### Thêm element type mới
1. Thêm type vào `ElementType` union trong `types.ts`
2. Tạo interface `NewElementProps extends BaseElementProps` trong `types.ts`
3. Thêm vào `AnyElementProps` union
4. Thêm case trong `getDefaultProps()` ở `ElementManager.ts`
5. Tạo hàm `renderNewElement()` trong `ElementManager.ts`
6. Thêm case trong `createElementDOM()` và `updateElementDOM()`
7. Thêm hàm `newElementProps()` trong `PropertyPanel.ts`
8. Thêm case trong switch của `renderPropertyPanel()`
9. Thêm button vào sidebar trong `index.html`
10. Thêm event listener trong `setupSidebar()` ở `main.ts`
11. Thêm CSS styles trong `page.css`
12. Nếu auto-height: thêm vào `isAutoHeightType()` trong `main.ts`

### Thêm template variable mới
1. Thêm field vào `buildDataFromCharacters()` trong `main.ts`
2. Thêm vào sidebar Template Variables trong `index.html`
3. Nếu cần data mới: cập nhật `characterService.ts` để load/merge

### Thêm template preset mới
1. Tạo file JSON trong `src/data/`
2. Import trong `main.ts` và thêm vào `templatePresets`
3. Thêm option vào `<select id="tool-template-preset">` trong `index.html`
4. Thêm entry vào `sampleLayouts` trong `server/src/seed.js`
5. Chạy `node src/seed.js` trong thư mục server

---

## 16. Lệnh thường dùng

```bash
# Frontend
cd web
npm run dev          # Dev server: http://localhost:5173/
npm run build        # Build production
npm run preview      # Preview production build

# Backend
cd server
npm run dev          # Dev server with nodemon
npm start            # Production start
node src/seed.js     # Seed sample layouts into DB

# Docker
docker-compose up -d # Start all services
```

---

## 17. Known Issues & TODOs

- [ ] **Selecto.js** đã cài nhưng chưa tích hợp (multi-select elements)
- [ ] **locked** property — có trong type nhưng chưa có UI
- [ ] **Zoom** — hiển thị 100% cố định, chưa có zoom in/out
- [ ] **Copy/Paste elements** — chưa implement
- [ ] **Snap guidelines** — Moveable snapping hoạt động nhưng chưa có visual guides
- [ ] **Font file size** — LXGWWenKai-Medium.ttf ~24MB, characters.json ~24MB → cần lazy loading hoặc CDN cho production
- [ ] **Data View** — Khi bật mà chưa có data, tự dùng "你好我" làm mẫu

# AGENTS.md
This file provides guidance to Verdent when working with code in this repository.

## Table of Contents
1. Commonly Used Commands
2. High-Level Architecture & Structure
3. Key Rules & Constraints
4. Development Hints

## Commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- No lint or test scripts are currently defined in `package.json`; use `npm run build` as the primary verification command. [inferred]
- Run a single test: not available; no test runner is configured. [inferred]

## Architecture
- Hanzi Layout Editor is a Vite + strict TypeScript, vanilla HTML/CSS/TS web app for designing printable A4 Hanzi practice worksheets.
- `index.html` owns the static shell: toolbar, left element/data sidebar, center A4 canvas (`#a4-page`), right properties panel, hidden template file input, and hidden `#print-container`.
- `src/main.ts` is the orchestration entry point: creates global `EditorState`, wires Moveable, toolbar/sidebar/keyboard handlers, template save/load, JSON data import, undo/redo, and print generation.
- `src/types.ts` is the source of truth for element props and template/data shapes. Current element types are `text`, `practiceGrid`, `characterBlock`, `table`, and `shape`.
- `src/editor/ElementManager.ts` owns element defaults, ids, mm/px conversion, DOM creation, and DOM updates.
- `src/editor/PropertyPanel.ts` renders the selected element’s property form as HTML strings and emits `data-prop` changes back to `src/main.ts`.
- `src/editor/UndoRedo.ts` stores JSON-cloned snapshots of `AnyElementProps[]`; `src/main.ts` is responsible for restoring DOM from snapshots.
- `src/template/TemplateEngine.ts` resolves `{{variable}}` placeholders from imported Hanzi JSON data and generates printable page models.
- `src/styles/*.css` is split by UI area; `src/styles/print.css` controls print/PDF behavior.
- External runtime dependencies are Moveable (`moveable`) for drag/resize/snap and Selecto (`selecto`) for planned multi-select; Selecto is installed but not integrated. [inferred]
- Fonts are loaded from Google Fonts in `index.html`: Inter, Noto Sans SC, and Noto Serif SC.
- Main lifecycle:
  - User adds an element from the sidebar → `getDefaultProps()` → `state.elements` → `createElementDOM()` → append to `#a4-page` → select and push undo state.
  - Selection sets `state.selectedId`, assigns `state.moveable.target`, and re-renders the property panel.
  - Property edits update props in `state.elements`, call `updateElementDOM()`, refresh Moveable, and push undo state.
  - Drag/resize events update DOM in px, convert back to mm via `pxToMm()`, refresh properties, and push undo state at operation end.
  - Generate/print clones current template elements, resolves variables against loaded JSON data, renders pages into `#print-container`, then calls `window.print()`.
- Mermaid diagram of subsystem relationships:
  ```mermaid
  graph TD
    HTML[index.html DOM shell] --> Main[src/main.ts]
    Main --> State[EditorState Map]
    Main --> Moveable[Moveable drag/resize]
    Main --> ElementManager[ElementManager render/defaults/units]
    Main --> PropertyPanel[PropertyPanel forms]
    Main --> UndoRedo[UndoRedo snapshots]
    Main --> TemplateEngine[TemplateEngine variables/pages]
    TemplateEngine --> Data[src/data/sampleData.json or imported JSON]
    ElementManager --> Canvas[#a4-page]
    TemplateEngine --> Print[#print-container + window.print]
    Styles[src/styles/*.css] --> Canvas
    Styles --> Print
  ```

## Key Rules & Constraints
- No `CLAUDE.md`, `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, or README file exists at repo root. [inferred]
- From `docs/PROJECT.md`: keep the app fully local/browser-only; there is no server, database, or API backend.
- From `docs/PROJECT.md`: element coordinates and dimensions are stored in millimeters for A4 print fidelity; convert to pixels only for screen rendering and Moveable interactions.
- From `docs/PROJECT.md`: template variables use `{{variable_name}}`; `_index` and `_index0` are built-ins.
- From `docs/PROJECT.md`: JSON template export format is `{ version, pageSize, elements }`.
- From `docs/PROJECT.md`: auto-height element types are `practiceGrid`, `characterBlock`, and `table`; avoid forcing `height` on them in canvas or print rendering.
- `tsconfig.json` uses `strict`, `noEmit`, `isolatedModules`, `moduleResolution: "bundler"`, `resolveJsonModule`, and `allowImportingTsExtensions`; existing imports include `.ts` extensions.
- `index.html` contains an “Image” add button, but `ElementType` and `ElementManager` do not implement an image element yet.

## Development Hints
- Adding a new element type:
  - Extend `ElementType`, `AnyElementProps`, and a concrete props interface in `src/types.ts`.
  - Add defaults, rendering, and update handling in `src/editor/ElementManager.ts`.
  - Add property UI in `src/editor/PropertyPanel.ts`.
  - Wire sidebar creation in `index.html` and `src/main.ts`; update `isAutoHeightType()` if the element sizes from content.
- Adding or changing template variables:
  - Update `HanziDataItem` in `src/types.ts` when the field is known.
  - Update `KNOWN_DESCRIPTIONS` in `src/template/TemplateEngine.ts` so the sidebar variable list is meaningful.
  - Keep variable-containing property inputs unrestricted; users need to type full `{{...}}` placeholders.
- Modifying print behavior:
  - Check both `generateAndPrint()` in `src/main.ts` and `src/styles/print.css`.
  - Preserve mm-based positioning in print output rather than screen px values.
- Modifying drag/resize behavior:
  - Keep Moveable event updates synchronized with `state.elements`, the property panel, and undo snapshots.
  - Text editing temporarily disables Moveable dragging; avoid breaking contenteditable blur handling.
- Modifying CI/CD pipeline:
  - No CI configuration exists currently. [inferred]
  - If adding CI, use `npm ci` followed by `npm run build` as the minimal project-specific check. [inferred]
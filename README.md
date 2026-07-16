# Canvas Atelier

A museum-quality generative art studio for abstract modernist posters - cream paper, fine black grid, organic charcoal forms. Built with React, TypeScript, and Vite.

## Live

**Production (GitHub Pages):** https://davidtphung.github.io/canvas-atelier/

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Local dev uses base `/`.

```bash
npm run build         # production build → dist/ (GitHub Pages base path)
npm run build:pages   # explicit Pages base `/canvas-atelier/`
npm run preview       # preview production build
npm run lint          # TypeScript check
```

## Features

- **Canvas engine** - SVG organic blobs, cutouts (subtract), drag / scale / rotate, grid snap & freeform
- **Styles** - calm, bold, playful, architectural, soft surreal
- **Image influence** - upload → opacity, blend, threshold, blur, posterize, influence → generate forms
- **Natural language refine** - e.g. “more asymmetric”, “increase negative space”, “museum-like”
- **Alive mode** - gentle morph, drift, grid shimmer
- **Export** - high-res PNG; MP4 when supported, WebM fallback; project JSON
- **Projects** - autosave (localStorage), library, import/export JSON
- **Accessibility** - keyboard shortcuts, focus states, reduced motion, high contrast, large targets, ARIA

## Architecture

```
src/
  components/     # UI modules (Canvas, Toolbar, Inspector, Export, …)
  hooks/          # Keyboard shortcuts
  lib/            # Geometry, art engine, export, storage
  store/          # Zustand studio state
  styles/         # Design tokens + global CSS
  types/          # Shared TypeScript types
```

## Design tokens

See `src/styles/tokens.css` for paper/ink surfaces, typography, spacing, radii, motion, and z-index.

## Accessibility notes

- Semantic landmarks, skip link, labeled controls
- Full keyboard nav: `V` select, `B` blob, `⌘/Ctrl+Z` undo, `⌘/Ctrl+S` save, `⌘/Ctrl+E` export, arrows nudge
- `prefers-reduced-motion` + in-app reduce motion
- High contrast mode; focus-visible rings
- Minimum hit targets (optional larger targets)

## Export assumptions

- **PNG** - SVG scene rasterized via canvas at chosen dimensions
- **Video** - `MediaRecorder` + `canvas.captureStream`. Prefers `video/mp4` when the browser supports it; otherwise **WebM** (VP9/VP8). Safari may offer MP4; Chromium typically WebM.
- Video export caps resolution for performance (max ~1280×1600) while PNG uses full preset sizes

## Assumptions

- Single-device project library (localStorage); not multi-user cloud sync
- Boolean “union” tags compositionally; subtract creates true cutout masks
- Pen freehand drawing is represented via blob placement + node morphing (full Bezier pen can be extended)
- Share link = export project JSON (no server-side share IDs)

## License

Private / demo showcase - adapt freely for your studio.

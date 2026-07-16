# Accessibility notes - Canvas Atelier

## Principles

- Clarity over chrome
- Predictable focus and state
- Never rely on color alone
- Comfortable targets on touch and pointer
- Graceful reduced motion

## Implemented

| Area | Behavior |
|------|----------|
| Structure | Landmarks (`banner`, `main`, `nav`, dialogs), skip link |
| Labels | `aria-label` / `aria-pressed` / `aria-checked` on tools & toggles |
| Keyboard | Full app shortcuts; arrow nudge; Escape clears UI |
| Focus | Visible `:focus-visible` rings via design tokens |
| Motion | `prefers-reduced-motion` + in-app Reduce motion |
| Contrast | High-contrast mode + system `prefers-contrast` |
| Targets | Default ≥36-40px; Large targets option → 44-48px |
| Live regions | Toast status region (`aria-live="polite"`) |
| Canvas | `role="img"` with project name; region labeled |

## Keyboard map

- `V` Select · `B` Add form · `H` Hand · `G` Toggle grid
- `⌘/Ctrl+Z` Undo · `⌘/Ctrl+Shift+Z` / `⌘/Ctrl+Y` Redo
- `⌘/Ctrl+S` Save · `⌘/Ctrl+E` Export · `⌘/Ctrl+D` Duplicate
- `Delete` / `Backspace` Delete selection
- Arrow keys nudge (Shift = larger step; grid snap when enabled)
- `Escape` Clear selection / close panels

## Gaps / future

- Full screen-reader path description of individual blob geometry
- SVG path announcements for selection changes
- High-DPI print CSS stylesheet

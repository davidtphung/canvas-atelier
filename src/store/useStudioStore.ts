import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  A11ySettings,
  AnimationSettings,
  ArtStyle,
  CanvasFormatId,
  CanvasOrientation,
  CanvasSettings,
  GridSettings,
  HistoryEntry,
  PanelId,
  ProjectDocument,
  Shape,
  Toast,
  Tool,
  UploadedImage,
} from '../types';
import {
  addBlobAt,
  applyRefinement,
  createDefaultComposition,
  regenerateComposition,
  shapesFromImage,
} from '../lib/artEngine';
import { snapToGrid } from '../lib/geometry';
import {
  DEFAULT_FORMAT_ID,
  DEFAULT_ORIENTATION,
  formatPhysicalLabel,
  remapShapesToCanvas,
  resolveOrientation,
  studioPixels,
} from '../lib/canvasFormats';
import {
  autosave,
  deleteProjectDocument,
  loadAutosave,
  loadLibrary,
  loadProjectDocument,
  saveProjectDocument,
} from '../lib/storage';
import {
  applyDocumentTheme,
  isDefaultBackground,
  isDefaultFill,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_CANVAS,
  type ThemePreference,
} from '../lib/theme';

const defaultPixels = studioPixels(DEFAULT_FORMAT_ID, DEFAULT_ORIENTATION);

const defaultCanvas: CanvasSettings = {
  width: defaultPixels.width,
  height: defaultPixels.height,
  formatId: DEFAULT_FORMAT_ID,
  orientation: DEFAULT_ORIENTATION,
  background: '#F4EFE6',
  shapeColor: '#1A1A1A',
  density: 1,
  softness: 0.55,
  contrast: 1,
  negativeSpace: 0.45,
  style: 'calm',
  freeform: true,
  alive: true,
  aliveIntensity: 0.4,
};

const defaultGrid: GridSettings = {
  visible: true,
  spacing: 32,
  opacity: 0.105,
  snap: true,
};

const defaultAnimation: AnimationSettings = {
  duration: 4,
  fps: 30,
  morph: true,
  drift: true,
  gridShimmer: true,
};

const defaultA11y: A11ySettings = {
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  highContrast: false,
  largeTargets: false,
  announceActions: true,
  theme: typeof window !== 'undefined' ? loadThemePreference() : 'system',
};

function snapshot(state: {
  shapes: Shape[];
  canvas: CanvasSettings;
  grid: GridSettings;
  image: UploadedImage | null;
  selectedIds: string[];
}): HistoryEntry {
  return {
    shapes: structuredClone(state.shapes),
    canvas: { ...state.canvas },
    grid: { ...state.grid },
    image: state.image ? structuredClone(state.image) : null,
    selectedIds: [...state.selectedIds],
  };
}

function applyEntry(
  entry: HistoryEntry,
): Pick<StudioState, 'shapes' | 'canvas' | 'grid' | 'image' | 'selectedIds'> {
  return {
    shapes: structuredClone(entry.shapes),
    canvas: { ...entry.canvas },
    grid: { ...entry.grid },
    image: entry.image ? structuredClone(entry.image) : null,
    selectedIds: [...entry.selectedIds],
  };
}

export type StudioState = {
  projectId: string;
  projectName: string;
  projectVersion: number;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSettings;
  grid: GridSettings;
  shapes: Shape[];
  image: UploadedImage | null;
  animation: AnimationSettings;
  a11y: A11ySettings;
  selectedIds: string[];
  tool: Tool;
  activePanel: PanelId;
  inspectorOpen: boolean;
  onboardingOpen: boolean;
  exportOpen: boolean;
  toasts: Toast[];
  past: HistoryEntry[];
  future: HistoryEntry[];
  library: ReturnType<typeof loadLibrary>;
  timelinePlaying: boolean;
  timelineTime: number;
  refinePrompt: string;
  lastRefineSummary: string;

  // Actions
  init: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setPanel: (panel: PanelId) => void;
  toggleInspector: () => void;
  setOnboarding: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  toast: (message: string) => void;
  dismissToast: (id: string) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  updateCanvas: (partial: Partial<CanvasSettings>) => void;
  updateGrid: (partial: Partial<GridSettings>) => void;
  updateAnimation: (partial: Partial<AnimationSettings>) => void;
  updateA11y: (partial: Partial<A11ySettings>) => void;
  updateShape: (id: string, partial: Partial<Shape>) => void;
  updateShapes: (updater: (shapes: Shape[]) => Shape[]) => void;
  addBlob: (x?: number, y?: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  reorderShape: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  toggleLock: (id: string) => void;
  toggleHide: (id: string) => void;
  setStyle: (style: ArtStyle) => void;
  setCanvasFormat: (formatId: CanvasFormatId) => void;
  setOrientation: (orientation: CanvasOrientation) => void;
  regenerate: () => void;
  setImage: (image: UploadedImage | null) => void;
  updateImage: (partial: Partial<UploadedImage>) => void;
  generateFromImage: () => Promise<void>;
  applyNlRefine: (prompt?: string) => void;
  setRefinePrompt: (v: string) => void;
  setAlive: (alive: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  cycleTheme: () => void;
  syncSystemTheme: () => void;
  setTimelinePlaying: (v: boolean) => void;
  setTimelineTime: (t: number) => void;
  saveProject: (name?: string) => void;
  loadProject: (id: string) => void;
  newProject: () => void;
  duplicateProject: () => void;
  deleteLibraryProject: (id: string) => void;
  importProject: (doc: ProjectDocument) => void;
  getDocument: () => ProjectDocument;
  scheduleAutosave: () => void;
  booleanSelected: (op: 'union' | 'subtract') => void;
};

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useStudioStore = create<StudioState>((set, get) => ({
  projectId: nanoid(12),
  projectName: 'Untitled Composition',
  projectVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canvas: defaultCanvas,
  grid: defaultGrid,
  shapes: createDefaultComposition(defaultCanvas),
  image: null,
  animation: defaultAnimation,
  a11y: defaultA11y,
  selectedIds: [],
  tool: 'ink',
  activePanel: null,
  inspectorOpen: true,
  onboardingOpen: false,
  exportOpen: false,
  toasts: [],
  past: [],
  future: [],
  library: [],
  timelinePlaying: false,
  timelineTime: 0,
  refinePrompt: '',
  lastRefineSummary: '',

  init: () => {
    const seen = localStorage.getItem('canvas-atelier:onboarded');
    const theme = loadThemePreference();
    const resolved = resolveTheme(theme);
    applyDocumentTheme(resolved);
    const auto = loadAutosave();
    if (auto) {
      const canvas = normalizeCanvas(auto.canvas);
      // Align default art colors with current theme if still defaults
      const themed = applyThemeToCanvasState(canvas, auto.shapes, resolved);
      set({
        projectId: auto.meta.id,
        projectName: auto.meta.name,
        projectVersion: auto.meta.version,
        createdAt: auto.meta.createdAt,
        updatedAt: auto.meta.updatedAt,
        canvas: themed.canvas,
        grid: auto.grid,
        shapes: themed.shapes,
        image: auto.image ?? null,
        animation: auto.animation,
        selectedIds: [],
        library: loadLibrary(),
        onboardingOpen: !seen,
        a11y: { ...defaultA11y, theme },
      });
    } else {
      const themed = applyThemeToCanvasState(defaultCanvas, get().shapes, resolved);
      set({
        library: loadLibrary(),
        onboardingOpen: !seen,
        a11y: { ...defaultA11y, theme },
        canvas: themed.canvas,
        shapes: themed.shapes,
      });
    }
  },

  pushHistory: () => {
    const s = get();
    const entry = snapshot(s);
    set({ past: [...s.past.slice(-49), entry], future: [] });
  },

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    const current = snapshot(s);
    set({
      past: s.past.slice(0, -1),
      future: [current, ...s.future].slice(0, 50),
      ...applyEntry(prev),
    });
    get().scheduleAutosave();
    get().toast('Undid last change');
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    const current = snapshot(s);
    set({
      future: s.future.slice(1),
      past: [...s.past, current].slice(-50),
      ...applyEntry(next),
    });
    get().scheduleAutosave();
    get().toast('Redid change');
  },

  setTool: (tool) => set({ tool }),
  setPanel: (panel) =>
    set((s) => ({
      activePanel: s.activePanel === panel ? null : panel,
      inspectorOpen:
        panel === 'inspector' || panel === 'layers' || panel === 'upload'
          ? true
          : s.inspectorOpen,
    })),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setOnboarding: (open) => {
    if (!open) localStorage.setItem('canvas-atelier:onboarded', '1');
    set({ onboardingOpen: open });
  },
  setExportOpen: (open) => set({ exportOpen: open }),

  toast: (message) => {
    if (!get().a11y.announceActions) return;
    const id = nanoid(6);
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message }] }));
    setTimeout(() => get().dismissToast(id), 2800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  select: (ids, additive) =>
    set((s) => {
      if (additive) {
        const setIds = new Set(s.selectedIds);
        ids.forEach((id) => {
          if (setIds.has(id)) setIds.delete(id);
          else setIds.add(id);
        });
        return { selectedIds: [...setIds] };
      }
      return { selectedIds: ids };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  updateCanvas: (partial) => {
    get().pushHistory();
    set((s) => ({ canvas: { ...s.canvas, ...partial }, updatedAt: new Date().toISOString() }));
    get().scheduleAutosave();
  },

  updateGrid: (partial) => {
    get().pushHistory();
    set((s) => ({ grid: { ...s.grid, ...partial }, updatedAt: new Date().toISOString() }));
    get().scheduleAutosave();
  },

  updateAnimation: (partial) => {
    set((s) => ({ animation: { ...s.animation, ...partial } }));
    get().scheduleAutosave();
  },

  updateA11y: (partial) => {
    set((s) => {
      const a11y = { ...s.a11y, ...partial };
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.highContrast = String(a11y.highContrast);
        document.documentElement.dataset.reducedMotion = String(a11y.reducedMotion);
      }
      if (partial.theme) {
        saveThemePreference(partial.theme);
        const resolved = resolveTheme(partial.theme);
        applyDocumentTheme(resolved);
        const themed = applyThemeToCanvasState(s.canvas, s.shapes, resolved);
        return { a11y, canvas: themed.canvas, shapes: themed.shapes };
      }
      return { a11y };
    });
    if (partial.theme) get().scheduleAutosave();
  },

  setTheme: (theme) => {
    get().updateA11y({ theme });
    const resolved = resolveTheme(theme);
    get().toast(resolved === 'dark' ? 'Dark mode' : theme === 'system' ? 'System theme' : 'Light mode');
  },

  cycleTheme: () => {
    const cur = get().a11y.theme;
    const next: ThemePreference =
      cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
    get().setTheme(next);
  },

  /** Re-apply colors when OS theme changes under "system" preference */
  syncSystemTheme: () => {
    if (get().a11y.theme !== 'system') return;
    const resolved = resolveTheme('system');
    applyDocumentTheme(resolved);
    const s = get();
    const themed = applyThemeToCanvasState(s.canvas, s.shapes, resolved);
    set({ canvas: themed.canvas, shapes: themed.shapes });
  },

  updateShape: (id, partial) => {
    set((s) => ({
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...partial } : sh)),
      updatedAt: new Date().toISOString(),
    }));
    get().scheduleAutosave();
  },

  updateShapes: (updater) => {
    get().pushHistory();
    set((s) => ({ shapes: updater(s.shapes), updatedAt: new Date().toISOString() }));
    get().scheduleAutosave();
  },

  addBlob: (x, y) => {
    get().pushHistory();
    const s = get();
    const cx = x ?? s.canvas.width * (0.3 + Math.random() * 0.3);
    const cy = y ?? s.canvas.height * (0.3 + Math.random() * 0.3);
    const shape = addBlobAt(s.canvas, cx, cy, s.shapes.length);
    if (s.grid.snap && !s.canvas.freeform) {
      shape.x = snapToGrid(shape.x, s.grid.spacing);
      shape.y = snapToGrid(shape.y, s.grid.spacing);
    }
    set({
      shapes: [...s.shapes, shape],
      selectedIds: [shape.id],
      tool: 'select',
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast('Added form');
  },

  deleteSelected: () => {
    const s = get();
    if (!s.selectedIds.length) return;
    get().pushHistory();
    const ids = new Set(s.selectedIds);
    set({
      shapes: s.shapes.filter((sh) => !ids.has(sh.id) && !ids.has(sh.parentId ?? '')),
      selectedIds: [],
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast('Deleted selection');
  },

  duplicateSelected: () => {
    const s = get();
    if (!s.selectedIds.length) return;
    get().pushHistory();
    const ids = new Set(s.selectedIds);
    const clones: Shape[] = [];
    const idMap = new Map<string, string>();
    for (const sh of s.shapes) {
      if (!ids.has(sh.id)) continue;
      const nid = nanoid(10);
      idMap.set(sh.id, nid);
      clones.push({
        ...structuredClone(sh),
        id: nid,
        name: `${sh.name} copy`,
        x: sh.x + 24,
        y: sh.y + 24,
        locked: false,
      });
    }
    // Remap parent ids for cutouts
    for (const c of clones) {
      if (c.parentId && idMap.has(c.parentId)) {
        c.parentId = idMap.get(c.parentId);
      }
    }
    set({
      shapes: [...s.shapes, ...clones],
      selectedIds: clones.map((c) => c.id),
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast('Duplicated');
  },

  reorderShape: (id, direction) => {
    get().pushHistory();
    set((s) => {
      const idx = s.shapes.findIndex((sh) => sh.id === id);
      if (idx < 0) return s;
      const next = [...s.shapes];
      const [item] = next.splice(idx, 1);
      if (direction === 'up') next.splice(Math.min(idx + 1, next.length), 0, item);
      else if (direction === 'down') next.splice(Math.max(idx - 1, 0), 0, item);
      else if (direction === 'top') next.push(item);
      else next.unshift(item);
      return { shapes: next, updatedAt: new Date().toISOString() };
    });
    get().scheduleAutosave();
  },

  toggleLock: (id) => {
    set((s) => ({
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, locked: !sh.locked } : sh)),
    }));
    get().scheduleAutosave();
  },

  toggleHide: (id) => {
    set((s) => ({
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, hidden: !sh.hidden } : sh)),
    }));
    get().scheduleAutosave();
  },

  setStyle: (style) => {
    get().pushHistory();
    const s = get();
    const canvas = { ...s.canvas, style };
    set({
      canvas,
      shapes: regenerateComposition(canvas),
      selectedIds: [],
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast(`Style: ${style}`);
  },

  setCanvasFormat: (formatId) => {
    get().pushHistory();
    const s = get();
    const orientation = resolveOrientation(formatId, s.canvas.orientation);
    const { width, height } = studioPixels(formatId, orientation);
    const shapes = remapShapesToCanvas(
      s.shapes,
      s.canvas.width,
      s.canvas.height,
      width,
      height,
    );
    set({
      canvas: {
        ...s.canvas,
        formatId,
        orientation,
        width,
        height,
      },
      shapes,
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast(formatPhysicalLabel(formatId, orientation));
  },

  setOrientation: (orientation) => {
    get().pushHistory();
    const s = get();
    const next = resolveOrientation(s.canvas.formatId, orientation);
    if (next === s.canvas.orientation && s.canvas.width && s.canvas.height) {
      // still allow portrait↔landscape flip when already matching id
    }
    const { width, height } = studioPixels(s.canvas.formatId, next);
    if (width === s.canvas.width && height === s.canvas.height) {
      set({
        canvas: { ...s.canvas, orientation: next },
        updatedAt: new Date().toISOString(),
      });
      get().scheduleAutosave();
      return;
    }
    const shapes = remapShapesToCanvas(
      s.shapes,
      s.canvas.width,
      s.canvas.height,
      width,
      height,
    );
    set({
      canvas: {
        ...s.canvas,
        orientation: next,
        width,
        height,
      },
      shapes,
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast(`${next[0].toUpperCase()}${next.slice(1)} · ${formatPhysicalLabel(s.canvas.formatId, next)}`);
  },

  regenerate: () => {
    get().pushHistory();
    const s = get();
    set({
      shapes: regenerateComposition(s.canvas),
      selectedIds: [],
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast('New composition');
  },

  setImage: (image) => {
    get().pushHistory();
    set({ image, updatedAt: new Date().toISOString() });
    get().scheduleAutosave();
  },

  updateImage: (partial) => {
    set((s) => {
      if (!s.image) return s;
      return { image: { ...s.image, ...partial }, updatedAt: new Date().toISOString() };
    });
    get().scheduleAutosave();
  },

  generateFromImage: async () => {
    const s = get();
    if (!s.image) {
      get().toast('Upload an image first');
      return;
    }
    get().pushHistory();
    get().toast('Tracing forms…');
    try {
      const shapes = await shapesFromImage(s.image, s.canvas);
      set({ shapes, selectedIds: shapes.map((sh) => sh.id), updatedAt: new Date().toISOString() });
      get().scheduleAutosave();
      get().toast(`Generated ${shapes.length} forms from image`);
    } catch {
      get().toast('Could not process image');
    }
  },

  applyNlRefine: (prompt) => {
    const s = get();
    const text = (prompt ?? s.refinePrompt).trim();
    if (!text) return;
    get().pushHistory();
    const result = applyRefinement(text, s.shapes, s.canvas);
    set({
      shapes: result.shapes,
      canvas: result.canvas,
      lastRefineSummary: result.summary,
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast(result.summary);
  },

  setRefinePrompt: (v) => set({ refinePrompt: v }),

  setAlive: (alive) => {
    set((s) => ({
      canvas: { ...s.canvas, alive },
      timelinePlaying: alive && !s.a11y.reducedMotion,
    }));
    get().scheduleAutosave();
  },

  setTimelinePlaying: (v) => set({ timelinePlaying: v }),
  setTimelineTime: (t) => set({ timelineTime: t }),

  getDocument: () => {
    const s = get();
    return {
      meta: {
        id: s.projectId,
        name: s.projectName,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        version: s.projectVersion,
      },
      canvas: s.canvas,
      grid: s.grid,
      shapes: s.shapes,
      image: s.image,
      animation: s.animation,
      selectedIds: s.selectedIds,
    };
  },

  saveProject: (name) => {
    const s = get();
    const now = new Date().toISOString();
    const projectName = name?.trim() || s.projectName;
    const doc: ProjectDocument = {
      ...s.getDocument(),
      meta: {
        id: s.projectId,
        name: projectName,
        createdAt: s.createdAt,
        updatedAt: now,
        version: s.projectVersion + 1,
      },
    };
    saveProjectDocument(doc);
    set({
      projectName,
      projectVersion: doc.meta.version,
      updatedAt: now,
      library: loadLibrary(),
    });
    get().toast(`Saved “${projectName}”`);
  },

  loadProject: (id) => {
    const doc = loadProjectDocument(id);
    if (!doc) {
      get().toast('Project not found');
      return;
    }
    get().pushHistory();
    set({
      projectId: doc.meta.id,
      projectName: doc.meta.name,
      projectVersion: doc.meta.version,
      createdAt: doc.meta.createdAt,
      updatedAt: doc.meta.updatedAt,
      canvas: normalizeCanvas(doc.canvas),
      grid: doc.grid,
      shapes: doc.shapes,
      image: doc.image ?? null,
      animation: doc.animation,
      selectedIds: [],
      activePanel: null,
    });
    get().scheduleAutosave();
    get().toast(`Opened “${doc.meta.name}”`);
  },

  newProject: () => {
    get().pushHistory();
    const canvas = { ...defaultCanvas };
    const now = new Date().toISOString();
    set({
      projectId: nanoid(12),
      projectName: 'Untitled Composition',
      projectVersion: 1,
      createdAt: now,
      updatedAt: now,
      canvas,
      grid: { ...defaultGrid },
      shapes: createDefaultComposition(canvas),
      image: null,
      selectedIds: [],
      animation: { ...defaultAnimation },
    });
    get().scheduleAutosave();
    get().toast('New project');
  },

  duplicateProject: () => {
    const s = get();
    const now = new Date().toISOString();
    set({
      projectId: nanoid(12),
      projectName: `${s.projectName} copy`,
      projectVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
    get().saveProject();
  },

  deleteLibraryProject: (id) => {
    deleteProjectDocument(id);
    set({ library: loadLibrary() });
    get().toast('Removed from library');
  },

  importProject: (doc) => {
    get().pushHistory();
    set({
      projectId: doc.meta.id || nanoid(12),
      projectName: doc.meta.name || 'Imported',
      projectVersion: doc.meta.version || 1,
      createdAt: doc.meta.createdAt || new Date().toISOString(),
      updatedAt: doc.meta.updatedAt || new Date().toISOString(),
      canvas: normalizeCanvas(doc.canvas),
      grid: doc.grid,
      shapes: doc.shapes,
      image: doc.image ?? null,
      animation: doc.animation ?? defaultAnimation,
      selectedIds: [],
    });
    get().scheduleAutosave();
    get().toast('Project imported');
  },

  scheduleAutosave: () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosave(get().getDocument());
    }, 600);
  },

  booleanSelected: (op) => {
    const s = get();
    if (s.selectedIds.length < 2) {
      get().toast('Select two shapes for boolean ops');
      return;
    }
    get().pushHistory();
    const [aId, bId] = s.selectedIds;
    set({
      shapes: s.shapes.map((sh) => {
        if (sh.id === bId) {
          return {
            ...sh,
            booleanOp: op === 'subtract' ? 'subtract' : 'union',
            parentId: op === 'subtract' ? aId : sh.parentId,
            kind: op === 'subtract' ? 'cutout' : sh.kind,
            name: op === 'subtract' ? 'Cutout' : sh.name,
          };
        }
        return sh;
      }),
      updatedAt: new Date().toISOString(),
    });
    get().scheduleAutosave();
    get().toast(op === 'subtract' ? 'Subtract applied' : 'Union tagged');
  },
}));

function applyThemeToCanvasState(
  canvas: CanvasSettings,
  shapes: Shape[],
  resolved: 'light' | 'dark',
): { canvas: CanvasSettings; shapes: Shape[] } {
  const palette = THEME_CANVAS[resolved];
  const nextCanvas = { ...canvas };
  if (isDefaultBackground(canvas.background)) {
    nextCanvas.background = palette.background;
  }
  if (isDefaultFill(canvas.shapeColor)) {
    nextCanvas.shapeColor = palette.shapeColor;
  }
  const nextShapes = shapes.map((s) =>
    isDefaultFill(s.fill) ? { ...s, fill: palette.shapeColor } : s,
  );
  return { canvas: nextCanvas, shapes: nextShapes };
}

/** Backfill format/orientation for older project JSON */
function normalizeCanvas(canvas: CanvasSettings): CanvasSettings {
  const formatId = canvas.formatId ?? DEFAULT_FORMAT_ID;
  let orientation = canvas.orientation;
  if (!orientation) {
    if (canvas.width === canvas.height) orientation = 'square';
    else if (canvas.width > canvas.height) orientation = 'landscape';
    else orientation = 'portrait';
  }
  orientation = resolveOrientation(formatId, orientation);
  // Prefer stored pixel size if present; otherwise recompute from format
  if (canvas.width > 0 && canvas.height > 0 && canvas.formatId) {
    return { ...defaultCanvas, ...canvas, formatId, orientation };
  }
  const { width, height } = studioPixels(formatId, orientation);
  return {
    ...defaultCanvas,
    ...canvas,
    formatId,
    orientation,
    width: canvas.width || width,
    height: canvas.height || height,
  };
}

export type ArtStyle =
  | 'calm'
  | 'bold'
  | 'playful'
  | 'architectural'
  | 'soft-surreal';

export type Tool =
  | 'select'
  | 'blob'
  | 'ink'
  | 'pen'
  | 'hand'
  | 'subtract'
  | 'union';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'difference';

export type ImageRole = 'reference' | 'mask' | 'texture' | 'trace';

export type ExportSizePreset =
  | 'social'
  | 'wallpaper'
  | 'poster'
  | 'square'
  | 'custom';

export type Point = { x: number; y: number };

export type BlobNode = {
  /** Relative offset from shape center in unit space (-1..1-ish) */
  angle: number;
  radius: number;
  /** Control handle softness 0–1 */
  tension: number;
};

export type ShapeKind = 'blob' | 'cutout' | 'group';

export type Shape = {
  id: string;
  kind: ShapeKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  nodes: BlobNode[];
  fill: string;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  /** For cutouts / boolean children */
  parentId?: string;
  /** Boolean operation relative to siblings */
  booleanOp?: 'none' | 'subtract' | 'union' | 'intersect';
  groupIds?: string[];
};

export type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  role: ImageRole;
  opacity: number;
  blendMode: BlendMode;
  threshold: number;
  blur: number;
  posterize: number;
  influence: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type GridSettings = {
  visible: boolean;
  spacing: number;
  opacity: number;
  snap: boolean;
};

export type CanvasOrientation = 'portrait' | 'landscape' | 'square';

export type CanvasFormatId =
  | 'us-8x10'
  | 'us-9x12'
  | 'us-11x14'
  | 'us-12x16'
  | 'us-16x20'
  | 'us-18x24'
  | 'us-20x24'
  | 'us-24x30'
  | 'us-24x36'
  | 'us-30x40'
  | 'us-36x48'
  | 'eu-f8'
  | 'eu-f12'
  | 'eu-f15'
  | 'eu-f20'
  | 'eu-f30'
  | 'eu-f40'
  | 'eu-f50'
  | 'sq-12'
  | 'sq-16'
  | 'sq-20'
  | 'sq-24'
  | 'sq-30'
  | 'a3'
  | 'a2'
  | 'a1';

export type CanvasSettings = {
  width: number;
  height: number;
  /** Real-world paint canvas format id */
  formatId: CanvasFormatId;
  /** Portrait / landscape / square (square formats lock to square) */
  orientation: CanvasOrientation;
  background: string;
  shapeColor: string;
  density: number;
  softness: number;
  contrast: number;
  negativeSpace: number;
  style: ArtStyle;
  freeform: boolean;
  alive: boolean;
  aliveIntensity: number;
};

export type AnimationSettings = {
  duration: number;
  fps: number;
  morph: boolean;
  drift: boolean;
  gridShimmer: boolean;
};

export type ThemePreference = 'light' | 'dark' | 'system';

export type A11ySettings = {
  reducedMotion: boolean;
  highContrast: boolean;
  largeTargets: boolean;
  announceActions: boolean;
  /** light | dark | system (follow OS) */
  theme: ThemePreference;
};

export type ProjectMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  thumbnail?: string;
};

export type ProjectDocument = {
  meta: ProjectMeta;
  canvas: CanvasSettings;
  grid: GridSettings;
  shapes: Shape[];
  image?: UploadedImage | null;
  animation: AnimationSettings;
  selectedIds: string[];
};

export type HistoryEntry = {
  shapes: Shape[];
  canvas: CanvasSettings;
  grid: GridSettings;
  image: UploadedImage | null;
  selectedIds: string[];
};

export type Toast = {
  id: string;
  message: string;
};

export type PanelId =
  | 'inspector'
  | 'layers'
  | 'upload'
  | 'timeline'
  | 'library'
  | 'a11y'
  | 'export'
  | 'onboarding'
  | null;

export type ExportOptions = {
  format: 'png' | 'mp4' | 'webm';
  preset: ExportSizePreset;
  width: number;
  height: number;
  duration: number;
  fps: number;
  filename: string;
};

export const EXPORT_PRESETS: Record<
  Exclude<ExportSizePreset, 'custom'>,
  { width: number; height: number; label: string }
> = {
  social: { width: 1080, height: 1350, label: 'Social 1080×1350' },
  wallpaper: { width: 1440, height: 2560, label: 'Wallpaper' },
  poster: { width: 2400, height: 3600, label: 'Poster print' },
  square: { width: 2048, height: 2048, label: 'Square' },
};

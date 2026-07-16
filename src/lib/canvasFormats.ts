/**
 * Real art-world paint canvas formats.
 * Physical sizes are authoritative; studio pixels keep the same aspect ratio
 * with the longer side mapped to STUDIO_LONG for editing performance.
 */

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

export type CanvasFormat = {
  id: CanvasFormatId;
  /** Short museum / studio label */
  label: string;
  /** Family for grouping in UI */
  family: 'us' | 'european' | 'square' | 'paper';
  /** Physical short edge (always the smaller side for non-square; for square both equal) */
  shortIn: number;
  /** Physical long edge */
  longIn: number;
  /** Display unit for UI */
  unit: 'in' | 'cm';
  /** Optional secondary physical label (e.g. French figure size) */
  note?: string;
  square?: boolean;
};

/** Studio pixel long-edge target */
export const STUDIO_LONG = 1000;

/**
 * Catalog of common commercial stretcher / atelier sizes.
 * US sizes in inches; French “Figure” (F) series converted from cm → inches.
 * A-series is ISO paper (artists often use for studies / giclée).
 */
export const CANVAS_FORMATS: CanvasFormat[] = [
  // United States standard stretched canvas
  { id: 'us-8x10', label: '8 × 10', family: 'us', shortIn: 8, longIn: 10, unit: 'in', note: 'US study' },
  { id: 'us-9x12', label: '9 × 12', family: 'us', shortIn: 9, longIn: 12, unit: 'in', note: 'US sketch' },
  { id: 'us-11x14', label: '11 × 14', family: 'us', shortIn: 11, longIn: 14, unit: 'in', note: 'US standard' },
  { id: 'us-12x16', label: '12 × 16', family: 'us', shortIn: 12, longIn: 16, unit: 'in', note: 'US standard' },
  { id: 'us-16x20', label: '16 × 20', family: 'us', shortIn: 16, longIn: 20, unit: 'in', note: 'US salon' },
  { id: 'us-18x24', label: '18 × 24', family: 'us', shortIn: 18, longIn: 24, unit: 'in', note: 'US gallery' },
  { id: 'us-20x24', label: '20 × 24', family: 'us', shortIn: 20, longIn: 24, unit: 'in', note: 'US gallery' },
  { id: 'us-24x30', label: '24 × 30', family: 'us', shortIn: 24, longIn: 30, unit: 'in', note: 'US large' },
  { id: 'us-24x36', label: '24 × 36', family: 'us', shortIn: 24, longIn: 36, unit: 'in', note: 'US panoramic' },
  { id: 'us-30x40', label: '30 × 40', family: 'us', shortIn: 30, longIn: 40, unit: 'in', note: 'US museum' },
  { id: 'us-36x48', label: '36 × 48', family: 'us', shortIn: 36, longIn: 48, unit: 'in', note: 'US monumental' },

  // French Figure (Figure) formats — portrait figure tradition (cm → in)
  { id: 'eu-f8', label: 'F8', family: 'european', shortIn: 38 / 2.54, longIn: 46 / 2.54, unit: 'cm', note: '46 × 38 cm · Figure' },
  { id: 'eu-f12', label: 'F12', family: 'european', shortIn: 50 / 2.54, longIn: 61 / 2.54, unit: 'cm', note: '61 × 50 cm · Figure' },
  { id: 'eu-f15', label: 'F15', family: 'european', shortIn: 54 / 2.54, longIn: 65 / 2.54, unit: 'cm', note: '65 × 54 cm · Figure' },
  { id: 'eu-f20', label: 'F20', family: 'european', shortIn: 60 / 2.54, longIn: 73 / 2.54, unit: 'cm', note: '73 × 60 cm · Figure' },
  { id: 'eu-f30', label: 'F30', family: 'european', shortIn: 73 / 2.54, longIn: 92 / 2.54, unit: 'cm', note: '92 × 73 cm · Figure' },
  { id: 'eu-f40', label: 'F40', family: 'european', shortIn: 81 / 2.54, longIn: 100 / 2.54, unit: 'cm', note: '100 × 81 cm · Figure' },
  { id: 'eu-f50', label: 'F50', family: 'european', shortIn: 89 / 2.54, longIn: 116 / 2.54, unit: 'cm', note: '116 × 89 cm · Figure' },

  // Square atelier
  { id: 'sq-12', label: '12 × 12', family: 'square', shortIn: 12, longIn: 12, unit: 'in', note: 'Square study', square: true },
  { id: 'sq-16', label: '16 × 16', family: 'square', shortIn: 16, longIn: 16, unit: 'in', note: 'Square', square: true },
  { id: 'sq-20', label: '20 × 20', family: 'square', shortIn: 20, longIn: 20, unit: 'in', note: 'Square gallery', square: true },
  { id: 'sq-24', label: '24 × 24', family: 'square', shortIn: 24, longIn: 24, unit: 'in', note: 'Square large', square: true },
  { id: 'sq-30', label: '30 × 30', family: 'square', shortIn: 30, longIn: 30, unit: 'in', note: 'Square museum', square: true },

  // ISO paper (common for studies / print planning)
  { id: 'a3', label: 'A3', family: 'paper', shortIn: 297 / 25.4, longIn: 420 / 25.4, unit: 'cm', note: '297 × 420 mm' },
  { id: 'a2', label: 'A2', family: 'paper', shortIn: 420 / 25.4, longIn: 594 / 25.4, unit: 'cm', note: '420 × 594 mm' },
  { id: 'a1', label: 'A1', family: 'paper', shortIn: 594 / 25.4, longIn: 841 / 25.4, unit: 'cm', note: '594 × 841 mm' },
];

export const FORMAT_BY_ID: Record<CanvasFormatId, CanvasFormat> = Object.fromEntries(
  CANVAS_FORMATS.map((f) => [f.id, f]),
) as Record<CanvasFormatId, CanvasFormat>;

export const DEFAULT_FORMAT_ID: CanvasFormatId = 'us-16x20';
export const DEFAULT_ORIENTATION: CanvasOrientation = 'portrait';

export function getFormat(id: CanvasFormatId): CanvasFormat {
  return FORMAT_BY_ID[id] ?? FORMAT_BY_ID[DEFAULT_FORMAT_ID];
}

/** Physical width × height in inches for orientation */
export function physicalInches(
  format: CanvasFormat,
  orientation: CanvasOrientation,
): { widthIn: number; heightIn: number } {
  if (format.square || orientation === 'square') {
    return { widthIn: format.longIn, heightIn: format.longIn };
  }
  if (orientation === 'landscape') {
    return { widthIn: format.longIn, heightIn: format.shortIn };
  }
  // portrait — taller
  return { widthIn: format.shortIn, heightIn: format.longIn };
}

/** Studio pixel size for a format + orientation */
export function studioPixels(
  formatId: CanvasFormatId,
  orientation: CanvasOrientation,
  longEdge = STUDIO_LONG,
): { width: number; height: number } {
  const format = getFormat(formatId);
  const { widthIn, heightIn } = physicalInches(format, orientation);
  const scale = longEdge / Math.max(widthIn, heightIn);
  return {
    width: Math.round(widthIn * scale),
    height: Math.round(heightIn * scale),
  };
}

export function resolveOrientation(
  formatId: CanvasFormatId,
  orientation: CanvasOrientation,
): CanvasOrientation {
  const format = getFormat(formatId);
  if (format.square) return 'square';
  if (orientation === 'square') return 'portrait';
  return orientation;
}

export function formatPhysicalLabel(
  formatId: CanvasFormatId,
  orientation: CanvasOrientation,
): string {
  const format = getFormat(formatId);
  const { widthIn, heightIn } = physicalInches(format, orientation);

  if (format.unit === 'cm' || format.family === 'european' || format.family === 'paper') {
    const wCm = Math.round(widthIn * 2.54);
    const hCm = Math.round(heightIn * 2.54);
    return `${format.label} · ${wCm} × ${hCm} cm`;
  }
  const w = Math.round(widthIn * 10) / 10;
  const h = Math.round(heightIn * 10) / 10;
  return `${w} × ${h} in`;
}

export function orientationLabel(o: CanvasOrientation): string {
  if (o === 'portrait') return 'Portrait';
  if (o === 'landscape') return 'Landscape';
  return 'Square';
}

export function familyLabel(family: CanvasFormat['family']): string {
  switch (family) {
    case 'us':
      return 'US stretcher';
    case 'european':
      return 'French Figure (F)';
    case 'square':
      return 'Square atelier';
    case 'paper':
      return 'ISO paper / study';
  }
}

/** Remap shapes when canvas size changes */
export function remapShapesToCanvas<
  T extends { x: number; y: number; width: number; height: number },
>(
  shapes: T[],
  fromW: number,
  fromH: number,
  toW: number,
  toH: number,
): T[] {
  if (fromW <= 0 || fromH <= 0) return shapes;
  const sx = toW / fromW;
  const sy = toH / fromH;
  return shapes.map((s) => ({
    ...s,
    x: s.x * sx,
    y: s.y * sy,
    width: s.width * sx,
    height: s.height * sy,
  }));
}

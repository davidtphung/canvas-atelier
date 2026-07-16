/**
 * Map pointer pressure → organic ink blob size.
 * Soft Inkling-like masses; harder press = larger pool.
 */

export type PaintPressureInput = {
  pressure: number;
  pointerType: string;
  /** Optional: recent motion speed (mouse thickness cue) */
  speed?: number;
  shiftKey?: boolean;
  altKey?: boolean;
  /** 0-1 from long-press dwell while holding still */
  dwell?: number;
};

/** Normalized paint weight 0.08 … 1 */
export function resolvePaintPressure(input: PaintPressureInput): number {
  const { pressure, pointerType, speed = 0, shiftKey, altKey, dwell = 0 } = input;

  if (shiftKey) return 0.95;
  if (altKey) return 0.18;

  if (pointerType === 'pen') {
    const p = pressure > 0.01 ? pressure : 0.35;
    return clamp01(0.12 + Math.pow(p, 0.9) * 0.88);
  }

  if (pointerType === 'touch') {
    if (pressure > 0.02 && pressure < 0.99) {
      return clamp01(0.15 + Math.pow(pressure, 0.85) * 0.85);
    }
    return clamp01(0.35 + dwell * 0.55);
  }

  const speedFactor = clamp01(1 - Math.min(speed, 2.5) / 2.5);
  const mouseBase = 0.28 + speedFactor * 0.35 + dwell * 0.4;
  if (pressure > 0.01 && pressure !== 0.5) {
    return clamp01(Math.max(mouseBase, pressure));
  }
  if (pressure === 0.5) {
    return clamp01(mouseBase);
  }
  return clamp01(mouseBase);
}

/** Organic blob size from pressure (About-page ink pools: soft ovals + mass) */
export function blobSizeFromPressure(pressure: number): {
  width: number;
  height: number;
} {
  const p = clamp01(pressure);
  const t = Math.pow(p, 0.75);
  const min = 36;
  const max = 220;
  const size = min + t * (max - min);
  // Elongated like About hero ellipses (rx/ry ~ 48/38, 36/42)
  const aspect = 0.78 + p * 0.1 + (Math.random() - 0.5) * 0.12;
  const stretch = 0.94 + Math.random() * 0.14;
  return {
    width: size * stretch,
    height: size * aspect,
  };
}

/**
 * Spacing between dabs along a stroke.
 * Closer than radius so the goo filter blends into continuous ink.
 */
export function dabSpacingFromPressure(pressure: number): number {
  const { width } = blobSizeFromPressure(pressure);
  return Math.max(10, width * 0.38);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

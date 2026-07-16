/**
 * Map pointer pressure → paint blob size.
 * Stylus/Apple Pencil use real pressure; mouse uses modifiers + velocity.
 */

export type PaintPressureInput = {
  pressure: number;
  pointerType: string;
  /** Optional: pixels/ms of recent motion (mouse thickness cue) */
  speed?: number;
  shiftKey?: boolean;
  altKey?: boolean;
  /** 0-1 from long-press dwell while holding still */
  dwell?: number;
};

/** Normalized paint weight 0.08 … 1 */
export function resolvePaintPressure(input: PaintPressureInput): number {
  const { pressure, pointerType, speed = 0, shiftKey, altKey, dwell = 0 } = input;

  // Explicit mouse “hard press”
  if (shiftKey) return 0.95;
  // Explicit light
  if (altKey) return 0.18;

  // Real pressure from pen / force-touch trackpad / some tablets
  if (pointerType === 'pen') {
    // pressure can be 0 on some pens until first sample
    const p = pressure > 0.01 ? pressure : 0.35;
    return clamp01(0.12 + Math.pow(p, 0.9) * 0.88);
  }

  if (pointerType === 'touch') {
    // Many touch devices report 0 or 1 only; blend with dwell
    if (pressure > 0.02 && pressure < 0.99) {
      return clamp01(0.15 + Math.pow(pressure, 0.85) * 0.85);
    }
    // Touch without force: base medium + dwell (press and hold grows)
    return clamp01(0.35 + dwell * 0.55);
  }

  // Mouse / unknown: mid base; slow movement or dwell = heavier “press”
  // Fast flick = thinner trail
  const speedFactor = clamp01(1 - Math.min(speed, 2.5) / 2.5); // slow → 1
  const mouseBase = 0.28 + speedFactor * 0.35 + dwell * 0.4;
  // If browser reports pressure on mouse (often 0.5 when down)
  if (pressure > 0.01 && pressure !== 0.5) {
    return clamp01(Math.max(mouseBase, pressure));
  }
  if (pressure === 0.5) {
    return clamp01(mouseBase);
  }
  return clamp01(mouseBase);
}

/** Pixel size for a paint dab from pressure (harder → larger) */
export function blobSizeFromPressure(pressure: number): {
  width: number;
  height: number;
} {
  const p = clamp01(pressure);
  // Soft curve: light dabs stay small; hard press blooms large
  const t = Math.pow(p, 0.75);
  const min = 22;
  const max = 240;
  const size = min + t * (max - min);
  // Organic aspect (slightly wider than tall, with pressure variance)
  const aspect = 0.82 + p * 0.12;
  return {
    width: size,
    height: size * aspect,
  };
}

/** Spacing between dabs along a stroke (larger brush = wider gap) */
export function dabSpacingFromPressure(pressure: number): number {
  const { width } = blobSizeFromPressure(pressure);
  return Math.max(8, width * 0.32);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

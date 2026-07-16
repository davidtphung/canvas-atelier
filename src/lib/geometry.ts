import type { BlobNode, Point, Shape } from '../types';

const TAU = Math.PI * 2;

/** Seeded PRNG for deterministic compositions */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function snapToGrid(value: number, spacing: number): number {
  if (spacing <= 0) return value;
  return Math.round(value / spacing) * spacing;
}

/** Generate organic blob nodes around a unit circle */
export function generateBlobNodes(
  count: number,
  softness: number,
  irregularity: number,
  rng: () => number = Math.random,
): BlobNode[] {
  const nodes: BlobNode[] = [];
  for (let i = 0; i < count; i++) {
    const base = i / count;
    const jitter = (rng() - 0.5) * irregularity;
    const angle = (base + jitter * 0.08) * TAU;
    const radius = 0.72 + (rng() - 0.5) * irregularity * 0.45;
    const tension = clamp(0.35 + softness * 0.4 + (rng() - 0.5) * 0.15, 0.15, 0.95);
    nodes.push({ angle, radius: clamp(radius, 0.35, 1.15), tension });
  }
  return nodes.sort((a, b) => a.angle - b.angle);
}

/** Convert polar blob nodes to cartesian points in local shape space */
export function nodesToPoints(
  nodes: BlobNode[],
  width: number,
  height: number,
  morphPhase = 0,
  morphAmp = 0,
): Point[] {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  return nodes.map((n, i) => {
    const breathe =
      morphAmp > 0
        ? 1 + Math.sin(morphPhase * TAU + i * 0.7) * morphAmp * 0.08
        : 1;
    const r = n.radius * breathe;
    return {
      x: cx + Math.cos(n.angle) * rx * r,
      y: cy + Math.sin(n.angle) * ry * r,
    };
  });
}

/**
 * Smooth closed path through points using cubic bezier approximation.
 * Tension modulates handle length for organic softness.
 */
export function pointsToPath(points: Point[], tensions: number[]): string {
  if (points.length < 3) return '';
  const n = points.length;
  const cmds: string[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const t = tensions[i] ?? 0.5;

    if (i === 0) {
      cmds.push(`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
    }

    // Catmull-Rom → cubic Bezier
    const c1x = p1.x + ((p2.x - p0.x) / 6) * (t + 0.5);
    const c1y = p1.y + ((p2.y - p0.y) / 6) * (t + 0.5);
    const c2x = p2.x - ((p3.x - p1.x) / 6) * (t + 0.5);
    const c2y = p2.y - ((p3.y - p1.y) / 6) * (t + 0.5);

    cmds.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }
  cmds.push('Z');
  return cmds.join(' ');
}

export function shapeToPath(shape: Shape, morphPhase = 0, morphAmp = 0): string {
  const points = nodesToPoints(shape.nodes, shape.width, shape.height, morphPhase, morphAmp);
  const tensions = shape.nodes.map((n) => n.tension);
  return pointsToPath(points, tensions);
}

export function shapeTransform(shape: Shape): string {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  return `translate(${shape.x} ${shape.y}) rotate(${shape.rotation} ${shape.width / 2} ${shape.height / 2})`;
  // Note: rotation origin is shape local center; cx/cy kept for potential external use
  void cx;
  void cy;
}

export function hitTestShape(
  shape: Shape,
  px: number,
  py: number,
  morphPhase = 0,
): boolean {
  if (shape.hidden || shape.kind === 'group') return false;
  // Inverse transform point into local space
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const rad = (-shape.rotation * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + shape.width / 2;
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + shape.height / 2;

  // Ray-cast against polygon approximation
  const points = nodesToPoints(shape.nodes, shape.width, shape.height, morphPhase, 0);
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > ly !== yj > ly && lx < ((xj - xi) * (ly - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function boundsOfShapes(shapes: Shape[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (!shapes.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function morphNodes(a: BlobNode[], b: BlobNode[], t: number): BlobNode[] {
  const len = Math.max(a.length, b.length);
  const out: BlobNode[] = [];
  for (let i = 0; i < len; i++) {
    const na = a[i % a.length];
    const nb = b[i % b.length];
    out.push({
      angle: lerp(na.angle, nb.angle, t),
      radius: lerp(na.radius, nb.radius, t),
      tension: lerp(na.tension, nb.tension, t),
    });
  }
  return out;
}

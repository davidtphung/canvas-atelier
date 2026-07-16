import type { BlobNode, Shape } from '../types';
import { clamp, shapeToPath } from './geometry';

export type FluidBody = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  /** Residual liquid jiggle energy 0…1+ */
  jiggle: number;
  /** Seconds of soft settle after impact */
  settle: number;
  locked: boolean;
};

export type FluidSample = {
  x: number;
  y: number;
  t: number;
};

const FRICTION = 0.965;
const MIN_VEL = 0.08;
const EDGE_BOUNCE = 0.55;
const MAX_SPEED = 42;
const JIGGLE_DECAY = 0.94;

export function createBodyFromShape(shape: Shape): FluidBody {
  return {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    vx: 0,
    vy: 0,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
    jiggle: 0,
    settle: 0,
    locked: shape.locked,
  };
}

/** Rolling pointer samples → throw velocity */
export function velocityFromSamples(samples: FluidSample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const recent = samples.slice(-6);
  const a = recent[0];
  const b = recent[recent.length - 1];
  const dt = Math.max(0.008, (b.t - a.t) / 1000);
  let vx = ((b.x - a.x) / dt) * 0.016; // scale to per-frame-ish units
  let vy = ((b.y - a.y) / dt) * 0.016;
  const speed = Math.hypot(vx, vy);
  if (speed > MAX_SPEED) {
    const s = MAX_SPEED / speed;
    vx *= s;
    vy *= s;
  }
  return { vx, vy };
}

/**
 * Deform organic nodes like viscous liquid under velocity + jiggle.
 * Stretch along motion, soft ripple around the rim.
 */
export function liquidDeformNodes(
  nodes: BlobNode[],
  vx: number,
  vy: number,
  jiggle: number,
  time: number,
  softness = 0.55,
): BlobNode[] {
  const speed = Math.hypot(vx, vy);
  const angle = speed > 0.01 ? Math.atan2(vy, vx) : 0;
  const stretchAmt = clamp(speed * 0.012, 0, 0.42);
  const jAmt = clamp(jiggle, 0, 1.4);

  return nodes.map((n, i) => {
    const align = Math.cos(n.angle - angle);
    const stretch = 1 + align * stretchAmt - (1 - Math.abs(align)) * stretchAmt * 0.35;
    const ripple =
      Math.sin(time * 7.2 + i * 1.35 + n.angle * 2) * jAmt * 0.07 +
      Math.sin(time * 11 + i * 0.6) * jAmt * 0.03;
    const pressure = Math.sin(time * 3.1 + n.angle * 3) * jAmt * 0.02;
    const radius = clamp(n.radius * stretch + ripple + pressure, 0.28, 1.35);
    const tension = clamp(
      n.tension + softness * 0.08 + stretchAmt * 0.25 + jAmt * 0.12,
      0.12,
      0.98,
    );
    return { ...n, radius, tension };
  });
}

export function shapePathWithFluid(
  shape: Shape,
  body: FluidBody | undefined,
  time: number,
  morphPhase: number,
  morphAmp: number,
  softness: number,
): string {
  const vx = body?.vx ?? 0;
  const vy = body?.vy ?? 0;
  const jiggle = body?.jiggle ?? 0;
  const nodes =
    Math.hypot(vx, vy) > 0.05 || jiggle > 0.02
      ? liquidDeformNodes(shape.nodes, vx, vy, jiggle, time, softness)
      : shape.nodes;
  const local: Shape = {
    ...shape,
    x: 0,
    y: 0,
    width: body?.width ?? shape.width,
    height: body?.height ?? shape.height,
    nodes,
  };
  return shapeToPath(local, morphPhase, morphAmp);
}

/** Integrate one physics step; mutates body. Returns true if still moving. */
export function integrateBody(
  body: FluidBody,
  canvasW: number,
  canvasH: number,
  dt = 1,
): boolean {
  if (body.locked) {
    body.vx = 0;
    body.vy = 0;
    body.jiggle *= JIGGLE_DECAY;
    return body.jiggle > 0.02;
  }

  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.vx *= FRICTION;
  body.vy *= FRICTION;
  body.jiggle *= JIGGLE_DECAY;
  if (body.settle > 0) body.settle -= 0.016 * dt;

  // Soft liquid walls — bounce with jiggle
  const pad = 4;
  if (body.x < pad) {
    body.x = pad;
    body.vx = Math.abs(body.vx) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.2, body.jiggle + 0.35);
  }
  if (body.y < pad) {
    body.y = pad;
    body.vy = Math.abs(body.vy) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.2, body.jiggle + 0.35);
  }
  if (body.x + body.width > canvasW - pad) {
    body.x = canvasW - pad - body.width;
    body.vx = -Math.abs(body.vx) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.2, body.jiggle + 0.35);
  }
  if (body.y + body.height > canvasH - pad) {
    body.y = canvasH - pad - body.height;
    body.vy = -Math.abs(body.vy) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.2, body.jiggle + 0.35);
  }

  // Gentle rotation drift while sliding
  if (Math.hypot(body.vx, body.vy) > 0.4) {
    body.rotation += body.vx * 0.04 * dt;
  }

  if (Math.hypot(body.vx, body.vy) < MIN_VEL) {
    body.vx = 0;
    body.vy = 0;
  }

  return Math.hypot(body.vx, body.vy) > 0 || body.jiggle > 0.02 || body.settle > 0;
}

/** Soft pairwise push so blobs feel like liquid pools, not hard solids */
export function softCollide(a: FluidBody, b: FluidBody): void {
  if (a.locked && b.locked) return;
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy) || 0.001;
  const minDist = (a.width + b.width + a.height + b.height) * 0.18;
  if (dist >= minDist) return;

  const overlap = (minDist - dist) / minDist;
  const nx = dx / dist;
  const ny = dy / dist;
  const push = overlap * 1.8;
  const j = overlap * 0.25;

  if (!a.locked) {
    a.vx -= nx * push;
    a.vy -= ny * push;
    a.jiggle = Math.min(1.3, a.jiggle + j);
  }
  if (!b.locked) {
    b.vx += nx * push;
    b.vy += ny * push;
    b.jiggle = Math.min(1.3, b.jiggle + j);
  }
}

export function impulseSelect(body: FluidBody): void {
  body.jiggle = Math.min(1.4, body.jiggle + 0.55);
  body.settle = 0.45;
  // Tiny wobble velocity
  body.vx += (Math.random() - 0.5) * 0.8;
  body.vy += (Math.random() - 0.5) * 0.8;
}

export function applyThrow(
  body: FluidBody,
  vx: number,
  vy: number,
): void {
  body.vx = vx;
  body.vy = vy;
  body.jiggle = Math.min(1.5, 0.35 + Math.hypot(vx, vy) * 0.04);
  body.settle = 0.6;
}

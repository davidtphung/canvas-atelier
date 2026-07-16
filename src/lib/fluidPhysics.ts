import type { BlobNode, Shape } from '../types';
import { clamp, generateBlobNodes, shapeToPath } from './geometry';

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
  /** Soft settle after impact */
  settle: number;
  locked: boolean;
  /** Cursor/finger target while smearing */
  fingerTarget: { x: number; y: number } | null;
  grabOffset: { x: number; y: number };
};

export type FluidSample = {
  x: number;
  y: number;
  t: number;
};

const FRICTION = 0.962;
const MIN_VEL = 0.05;
const EDGE_BOUNCE = 0.48;
const MAX_SPEED = 46;
const JIGGLE_DECAY = 0.935;
const FINGER_SPRING = 0.3;
const FINGER_DAMP = 0.84;

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
    fingerTarget: null,
    grabOffset: { x: 0, y: 0 },
  };
}

/** Rolling pointer samples → throw velocity */
export function velocityFromSamples(samples: FluidSample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const recent = samples.slice(-6);
  const a = recent[0];
  const b = recent[recent.length - 1];
  const dt = Math.max(0.008, (b.t - a.t) / 1000);
  let vx = ((b.x - a.x) / dt) * 0.016;
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
 * Organic ink deformation — soft stretch + slow surface ripple.
 * Preserves About-page lobed silhouette; motion only gently breathes it.
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
  // Keep stretch subtle so organic lobes stay readable
  const stretchAmt = clamp(speed * 0.009, 0, 0.28);
  const jAmt = clamp(jiggle, 0, 1.15);

  return nodes.map((n, i) => {
    const align = Math.cos(n.angle - angle);
    const stretch =
      1 +
      align * stretchAmt * 0.85 -
      (1 - Math.abs(align)) * stretchAmt * 0.28;
    // Slow, low-frequency ripple only (no high-freq edge noise)
    const ripple =
      Math.sin(time * 4.2 + i * 0.9 + n.angle * 1.6) * jAmt * 0.038 +
      Math.cos(time * 2.1 + n.angle * 2.4) * jAmt * 0.016;
    const radius = clamp(n.radius * stretch + ripple, 0.4, 1.22);
    const tension = clamp(
      n.tension + softness * 0.08 + stretchAmt * 0.12 + jAmt * 0.06,
      0.4,
      0.99,
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
  /** Higher = skip deformation more often (mobile) */
  deformThreshold = 0.04,
): string {
  const vx = body?.vx ?? 0;
  const vy = body?.vy ?? 0;
  const jiggle = body?.jiggle ?? 0;
  const nodes =
    Math.hypot(vx, vy) > deformThreshold || jiggle > deformThreshold * 0.4
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
    body.fingerTarget = null;
    return body.jiggle > 0.02;
  }

  // Viscous finger spring — ink follows cursor like wet paint
  if (body.fingerTarget) {
    const cx = body.x + body.width / 2;
    const cy = body.y + body.height / 2;
    const tx = body.fingerTarget.x - body.grabOffset.x;
    const ty = body.fingerTarget.y - body.grabOffset.y;
    body.vx += (tx - cx) * FINGER_SPRING * dt;
    body.vy += (ty - cy) * FINGER_SPRING * dt;
    body.vx *= FINGER_DAMP;
    body.vy *= FINGER_DAMP;
    body.jiggle = Math.max(body.jiggle, 0.4 + Math.hypot(body.vx, body.vy) * 0.028);
    const spd = Math.hypot(body.vx, body.vy);
    if (spd > 2) {
      body.width = Math.min(body.width * (1 + 0.0012 * dt), body.width * 1.0015);
      body.height = Math.min(body.height * (1 + 0.001 * dt), body.height * 1.0015);
    }
  }

  body.x += body.vx * dt;
  body.y += body.vy * dt;

  if (!body.fingerTarget) {
    body.vx *= FRICTION;
    body.vy *= FRICTION;
  }

  body.jiggle *= JIGGLE_DECAY;
  if (body.settle > 0) body.settle -= 0.016 * dt;

  const pad = 4;
  if (body.x < pad) {
    body.x = pad;
    body.vx = Math.abs(body.vx) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.25, body.jiggle + 0.3);
  }
  if (body.y < pad) {
    body.y = pad;
    body.vy = Math.abs(body.vy) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.25, body.jiggle + 0.3);
  }
  if (body.x + body.width > canvasW - pad) {
    body.x = canvasW - pad - body.width;
    body.vx = -Math.abs(body.vx) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.25, body.jiggle + 0.3);
  }
  if (body.y + body.height > canvasH - pad) {
    body.y = canvasH - pad - body.height;
    body.vy = -Math.abs(body.vy) * EDGE_BOUNCE;
    body.jiggle = Math.min(1.25, body.jiggle + 0.3);
  }

  if (Math.hypot(body.vx, body.vy) > 0.5) {
    body.rotation += body.vx * 0.028 * dt;
  }

  if (Math.hypot(body.vx, body.vy) < MIN_VEL && !body.fingerTarget) {
    body.vx = 0;
    body.vy = 0;
  }

  return (
    Math.hypot(body.vx, body.vy) > 0 ||
    body.jiggle > 0.02 ||
    body.settle > 0 ||
    body.fingerTarget != null
  );
}

/**
 * Soft pairwise push — light enough that overlapping dabs rest together
 * and the SVG goo filter blends them into one natural ink mass.
 */
export function softCollide(a: FluidBody, b: FluidBody): void {
  if (a.locked && b.locked) return;
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy) || 0.001;
  // Smaller minDist → blobs can nestle / visually merge
  const minDist = (a.width + b.width + a.height + b.height) * 0.14;
  if (dist >= minDist) return;

  const overlap = (minDist - dist) / minDist;
  const nx = dx / dist;
  const ny = dy / dist;
  // Soft repulsion only when deeply overlapping
  const push = overlap * overlap * 1.15;
  const j = overlap * 0.16;

  if (!a.locked && !a.fingerTarget) {
    a.vx -= nx * push;
    a.vy -= ny * push;
    a.jiggle = Math.min(1.25, a.jiggle + j);
  }
  if (!b.locked && !b.fingerTarget) {
    b.vx += nx * push;
    b.vy += ny * push;
    b.jiggle = Math.min(1.25, b.jiggle + j);
  }
}

/** Ambient hover field — soft ink parting under the cursor */
export function applyProximityField(
  body: FluidBody,
  px: number,
  py: number,
  strength = 1,
): void {
  if (body.locked || body.fingerTarget) return;
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const dx = cx - px;
  const dy = cy - py;
  const dist = Math.hypot(dx, dy) || 0.001;
  const radius = Math.max(body.width, body.height) * 0.8 + 72;
  if (dist > radius) return;

  const falloff = 1 - dist / radius;
  const force = falloff * falloff * 0.42 * strength;
  body.vx += (dx / dist) * force;
  body.vy += (dy / dist) * force;
  body.jiggle = Math.min(1.15, body.jiggle + falloff * 0.1);
}

/** Trackpad two-finger scroll / wheel — shove ink across the paper */
export function applyTrackpadPush(
  body: FluidBody,
  dx: number,
  dy: number,
  px: number,
  py: number,
): void {
  if (body.locked) return;
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const dist = Math.hypot(cx - px, cy - py);
  const influence = Math.max(0, 1 - dist / 420);
  if (influence <= 0) return;
  body.vx += dx * 0.075 * influence;
  body.vy += dy * 0.075 * influence;
  body.jiggle = Math.min(1.25, body.jiggle + influence * 0.18);
}

export function beginFingerGrab(
  body: FluidBody,
  pointerX: number,
  pointerY: number,
): void {
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  body.grabOffset = { x: pointerX - cx, y: pointerY - cy };
  body.fingerTarget = { x: pointerX, y: pointerY };
  body.vx *= 0.28;
  body.vy *= 0.28;
  body.jiggle = Math.max(body.jiggle, 0.5);
}

export function updateFingerGrab(
  body: FluidBody,
  pointerX: number,
  pointerY: number,
): void {
  body.fingerTarget = { x: pointerX, y: pointerY };
}

export function releaseFingerGrab(body: FluidBody, samples: FluidSample[]): void {
  body.fingerTarget = null;
  const v = velocityFromSamples(samples);
  body.vx = v.vx * 0.9;
  body.vy = v.vy * 0.9;
  body.jiggle = Math.min(1.4, 0.35 + Math.hypot(v.vx, v.vy) * 0.04);
  body.settle = 0.55;
}

export function impulseSelect(body: FluidBody): void {
  body.jiggle = Math.min(1.35, body.jiggle + 0.5);
  body.settle = 0.4;
  body.vx += (Math.random() - 0.5) * 0.7;
  body.vy += (Math.random() - 0.5) * 0.7;
}

export function applyThrow(body: FluidBody, vx: number, vy: number): void {
  body.vx = vx;
  body.vy = vy;
  body.jiggle = Math.min(1.4, 0.32 + Math.hypot(vx, vy) * 0.038);
  body.settle = 0.55;
  body.fingerTarget = null;
}

/** Grow a puddle while finger holds still (ink soaks into paper) */
export function growPuddle(body: FluidBody, amount: number): void {
  const a = clamp(amount, 0, 8);
  body.width += a * 0.5;
  body.height += a * 0.44;
  body.jiggle = Math.min(1.35, body.jiggle + 0.07);
}

/**
 * Fresh paint dab silhouette — matches About page organic ink masses:
 * soft lobes, high tension curves, bean bias.
 */
export function inkBlobNodes(pressure: number, simple = false): BlobNode[] {
  const soft = 0.68 + pressure * 0.25;
  // Enough irregularity for lobed ink; not enough for spikes
  const irreg = simple ? 0.32 + pressure * 0.14 : 0.4 + pressure * 0.22;
  const count = simple ? 8 + Math.floor(pressure * 2) : 10 + Math.floor(pressure * 4);
  return generateBlobNodes(count, soft, irreg);
}

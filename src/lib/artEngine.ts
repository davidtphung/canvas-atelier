import { nanoid } from 'nanoid';
import type { ArtStyle, CanvasSettings, Shape, UploadedImage } from '../types';
import { clamp, generateBlobNodes, mulberry32 } from './geometry';

const STYLE_PRESETS: Record<
  ArtStyle,
  { nodeCount: number; irregularity: number; scale: number; countBias: number }
> = {
  calm: { nodeCount: 8, irregularity: 0.28, scale: 1, countBias: 0.7 },
  bold: { nodeCount: 7, irregularity: 0.42, scale: 1.15, countBias: 1.1 },
  playful: { nodeCount: 10, irregularity: 0.55, scale: 0.9, countBias: 1.2 },
  architectural: { nodeCount: 6, irregularity: 0.18, scale: 1.05, countBias: 0.85 },
  'soft-surreal': { nodeCount: 12, irregularity: 0.48, scale: 1.08, countBias: 0.95 },
};

function createShape(
  partial: Partial<Shape> & Pick<Shape, 'x' | 'y' | 'width' | 'height'>,
  style: ArtStyle,
  softness: number,
  rng: () => number,
  name?: string,
): Shape {
  const preset = STYLE_PRESETS[style];
  const nodes = generateBlobNodes(
    preset.nodeCount,
    softness,
    preset.irregularity,
    rng,
  );
  return {
    id: nanoid(10),
    kind: 'blob',
    name: name ?? 'Form',
    rotation: (rng() - 0.5) * (style === 'architectural' ? 8 : 24),
    nodes,
    fill: '#1A1A1A',
    opacity: 1,
    locked: false,
    hidden: false,
    booleanOp: 'none',
    ...partial,
  };
}

/** Curated default museum composition — balanced asymmetry on cream paper */
export function createDefaultComposition(
  canvas: Pick<CanvasSettings, 'width' | 'height' | 'style' | 'softness' | 'density' | 'shapeColor'>,
  seed = 42,
): Shape[] {
  const rng = mulberry32(seed);
  const { width: W, height: H, style, softness, density, shapeColor } = canvas;
  const preset = STYLE_PRESETS[style];
  const d = clamp(density, 0.2, 1.6);

  const main = createShape(
    {
      x: W * 0.08,
      y: H * 0.22,
      width: W * 0.58 * preset.scale * d,
      height: H * 0.52 * preset.scale * d,
      name: 'Anchor form',
      fill: shapeColor,
    },
    style,
    softness,
    rng,
  );

  const satellite = createShape(
    {
      x: W * 0.52,
      y: H * 0.12,
      width: W * 0.34 * d,
      height: H * 0.28 * d,
      name: 'Satellite',
      fill: shapeColor,
    },
    style,
    softness + 0.1,
    rng,
  );

  const cutoutHost = createShape(
    {
      x: W * 0.42,
      y: H * 0.48,
      width: W * 0.38 * d,
      height: H * 0.36 * d,
      name: 'Mass with void',
      fill: shapeColor,
    },
    style,
    softness,
    rng,
  );

  const cutout: Shape = {
    ...createShape(
      {
        x: cutoutHost.x + cutoutHost.width * 0.28,
        y: cutoutHost.y + cutoutHost.height * 0.22,
        width: cutoutHost.width * 0.38,
        height: cutoutHost.height * 0.42,
        name: 'Cutout',
        kind: 'cutout',
        fill: '#000000',
        parentId: cutoutHost.id,
        booleanOp: 'subtract',
      },
      style,
      0.7,
      rng,
    ),
    kind: 'cutout',
    booleanOp: 'subtract',
    parentId: cutoutHost.id,
  };

  const accent = createShape(
    {
      x: W * 0.12,
      y: H * 0.68,
      width: W * 0.22 * d,
      height: H * 0.16 * d,
      name: 'Footnote mass',
      fill: shapeColor,
      opacity: 0.92,
    },
    style,
    softness + 0.15,
    rng,
  );

  // Light architectural counters for density
  const extras: Shape[] = [];
  if (d > 0.85) {
    extras.push(
      createShape(
        {
          x: W * 0.72,
          y: H * 0.62,
          width: W * 0.16,
          height: H * 0.2,
          name: 'Counterweight',
          fill: shapeColor,
        },
        style,
        softness,
        rng,
      ),
    );
  }

  return [main, satellite, cutoutHost, cutout, accent, ...extras];
}

export function addBlobAt(
  canvas: CanvasSettings,
  x: number,
  y: number,
  index: number,
): Shape {
  const rng = mulberry32(Date.now() + index);
  const size = 80 + rng() * 120;
  return createShape(
    {
      x: x - size / 2,
      y: y - size / 2,
      width: size * (0.85 + rng() * 0.4),
      height: size * (0.75 + rng() * 0.5),
      name: `Form ${index + 1}`,
      fill: canvas.shapeColor,
    },
    canvas.style,
    canvas.softness,
    rng,
  );
}

/** Natural-language refinement → canvas + shape adjustments */
export function applyRefinement(
  prompt: string,
  shapes: Shape[],
  canvas: CanvasSettings,
): { shapes: Shape[]; canvas: CanvasSettings; summary: string } {
  const p = prompt.toLowerCase().trim();
  let nextCanvas = { ...canvas };
  let nextShapes = shapes.map((s) => ({ ...s, nodes: s.nodes.map((n) => ({ ...n })) }));
  const notes: string[] = [];

  const W = canvas.width;
  const H = canvas.height;

  if (/asymmetric|asymmetr/.test(p)) {
    nextShapes = nextShapes.map((s, i) => {
      if (s.kind === 'cutout') return s;
      const shift = (i % 2 === 0 ? 1 : -1) * W * 0.04;
      return { ...s, x: clamp(s.x + shift, 0, W - s.width), rotation: s.rotation + (i % 2 ? 4 : -3) };
    });
    notes.push('increased asymmetry');
  }

  if (/less dense|sparse|open|breathing room|negative space|more space|calmer/.test(p)) {
    nextCanvas.density = clamp(nextCanvas.density * 0.82, 0.25, 1.6);
    nextCanvas.negativeSpace = clamp(nextCanvas.negativeSpace + 0.12, 0, 1);
    nextShapes = nextShapes.map((s) => {
      if (s.kind === 'cutout' || s.locked) return s;
      return {
        ...s,
        width: s.width * 0.92,
        height: s.height * 0.92,
        x: s.x + s.width * 0.04,
        y: s.y + s.height * 0.04,
      };
    });
    notes.push('opened negative space');
  }

  if (/more dense|denser|busier|fill/.test(p)) {
    nextCanvas.density = clamp(nextCanvas.density * 1.15, 0.25, 1.6);
    nextShapes = nextShapes.map((s) => {
      if (s.kind === 'cutout' || s.locked) return s;
      return { ...s, width: s.width * 1.08, height: s.height * 1.08 };
    });
    notes.push('increased density');
  }

  if (/top-?right|upper right|northeast/.test(p)) {
    const targets = nextShapes.filter((s) => s.kind !== 'cutout' && !s.locked);
    if (targets[0]) {
      const s = targets[0];
      const idx = nextShapes.findIndex((x) => x.id === s.id);
      nextShapes[idx] = {
        ...s,
        x: W * 0.55,
        y: H * 0.08,
      };
      notes.push('anchored mass top-right');
    }
  }

  if (/top-?left|upper left/.test(p)) {
    const targets = nextShapes.filter((s) => s.kind !== 'cutout' && !s.locked);
    if (targets[0]) {
      const s = targets[0];
      const idx = nextShapes.findIndex((x) => x.id === s.id);
      nextShapes[idx] = { ...s, x: W * 0.06, y: H * 0.08 };
      notes.push('anchored mass top-left');
    }
  }

  if (/bottom|lower/.test(p) && /anchor|weight|mass/.test(p)) {
    const targets = nextShapes.filter((s) => s.kind !== 'cutout' && !s.locked);
    const s = targets[targets.length - 1];
    if (s) {
      const idx = nextShapes.findIndex((x) => x.id === s.id);
      nextShapes[idx] = { ...s, y: H * 0.62, x: W * 0.1 };
      notes.push('weighted lower mass');
    }
  }

  if (/circular|rounder|round|circle/.test(p)) {
    const onlyCutout = /cutout/.test(p);
    nextShapes = nextShapes.map((s) => {
      if (onlyCutout && s.kind !== 'cutout') return s;
      if (!onlyCutout && s.kind === 'cutout') {
        // still round cutouts when general "circular" is requested
      }
      const avg = (s.width + s.height) / 2;
      const roundMore = s.kind === 'cutout' || onlyCutout;
      return {
        ...s,
        width: roundMore ? avg : s.width,
        height: roundMore ? avg : s.height,
        nodes: s.nodes.map((n) => ({
          ...n,
          radius: lerpRadius(n.radius, roundMore ? 0.88 : 0.9, roundMore ? 0.65 : 0.5),
          tension: clamp(n.tension + 0.15, 0.2, 0.95),
        })),
      };
    });
    notes.push(onlyCutout ? 'rounder cutout' : 'rounded silhouettes');
  }

  if (/museum|quiet|restrained|elegant|refined/.test(p)) {
    nextCanvas.style = 'calm';
    nextCanvas.softness = clamp(nextCanvas.softness + 0.08, 0, 1);
    nextCanvas.contrast = clamp(nextCanvas.contrast * 0.95, 0.3, 1.5);
    nextShapes = nextShapes.map((s) => ({
      ...s,
      rotation: s.rotation * 0.6,
      opacity: s.kind === 'cutout' ? s.opacity : clamp(s.opacity, 0.88, 1),
    }));
    notes.push('museum-like restraint');
  }

  if (/bold|stronger|heavier|graphic/.test(p)) {
    nextCanvas.style = 'bold';
    nextCanvas.contrast = clamp(nextCanvas.contrast * 1.1, 0.3, 1.5);
    nextShapes = nextShapes.map((s) =>
      s.kind === 'cutout' ? s : { ...s, opacity: 1, width: s.width * 1.05, height: s.height * 1.05 },
    );
    notes.push('stronger graphic weight');
  }

  if (/playful|lively|fun/.test(p)) {
    nextCanvas.style = 'playful';
    nextShapes = nextShapes.map((s, i) => ({
      ...s,
      rotation: s.rotation + (i % 2 ? 6 : -5),
      nodes: s.nodes.map((n) => ({
        ...n,
        radius: n.radius * (0.92 + ((i + 1) % 3) * 0.04),
        tension: clamp(n.tension - 0.05, 0.15, 0.95),
      })),
    }));
    notes.push('playful energy');
  }

  if (/architectural|structured|grid|strict/.test(p)) {
    nextCanvas.style = 'architectural';
    nextCanvas.freeform = false;
    nextShapes = nextShapes.map((s) => ({
      ...s,
      rotation: Math.round(s.rotation / 5) * 5 * 0.3,
      nodes: s.nodes.map((n) => ({ ...n, tension: clamp(n.tension - 0.1, 0.2, 0.8), radius: lerpRadius(n.radius, 0.85, 0.4) })),
    }));
    notes.push('architectural discipline');
  }

  if (/soft|surreal|dream/.test(p)) {
    nextCanvas.style = 'soft-surreal';
    nextCanvas.softness = clamp(nextCanvas.softness + 0.2, 0, 1);
    nextShapes = nextShapes.map((s) => ({
      ...s,
      nodes: s.nodes.map((n) => ({ ...n, tension: clamp(n.tension + 0.2, 0.2, 0.98) })),
    }));
    notes.push('softer, surreal edges');
  }

  if (/softer|smoother|organic/.test(p) && !/surreal/.test(p)) {
    nextCanvas.softness = clamp(nextCanvas.softness + 0.15, 0, 1);
    nextShapes = nextShapes.map((s) => ({
      ...s,
      nodes: s.nodes.map((n) => ({ ...n, tension: clamp(n.tension + 0.12, 0.2, 0.98) })),
    }));
    notes.push('softer contours');
  }

  if (/harder|sharper|crisper/.test(p)) {
    nextCanvas.softness = clamp(nextCanvas.softness - 0.15, 0, 1);
    nextShapes = nextShapes.map((s) => ({
      ...s,
      nodes: s.nodes.map((n) => ({ ...n, tension: clamp(n.tension - 0.12, 0.1, 0.9) })),
    }));
    notes.push('crisper edges');
  }

  if (/contrast/.test(p)) {
    if (/more|higher|increase/.test(p)) {
      nextCanvas.contrast = clamp(nextCanvas.contrast + 0.15, 0.3, 1.5);
      notes.push('higher contrast');
    } else if (/less|lower|decrease|softer/.test(p)) {
      nextCanvas.contrast = clamp(nextCanvas.contrast - 0.12, 0.3, 1.5);
      notes.push('softer contrast');
    }
  }

  if (/rebalance|balance|recenter|center/.test(p)) {
    const visible = nextShapes.filter((s) => !s.hidden && s.kind !== 'cutout');
    if (visible.length) {
      const cx = visible.reduce((a, s) => a + s.x + s.width / 2, 0) / visible.length;
      const cy = visible.reduce((a, s) => a + s.y + s.height / 2, 0) / visible.length;
      const dx = W / 2 - cx;
      const dy = H / 2 - cy * 0.9;
      nextShapes = nextShapes.map((s) =>
        s.locked ? s : { ...s, x: s.x + dx * 0.6, y: s.y + dy * 0.5 },
      );
      notes.push('rebalanced composition');
    }
  }

  if (!notes.length) {
    // Gentle default refinement
    nextShapes = nextShapes.map((s, i) => ({
      ...s,
      rotation: s.rotation + (i % 2 ? 1.5 : -1.5),
      nodes: s.nodes.map((n) => ({
        ...n,
        radius: n.radius * (0.98 + Math.sin(i) * 0.02),
      })),
    }));
    notes.push('subtle compositional polish');
  }

  return {
    shapes: nextShapes,
    canvas: nextCanvas,
    summary: notes.join(' · '),
  };
}

function lerpRadius(r: number, target: number, t: number): number {
  return r + (target - r) * t;
}

/**
 * Extract abstract shapes from an uploaded image via luminance sampling.
 * Returns organic blobs that trace dark regions in a posterized modernist way.
 */
export async function shapesFromImage(
  image: UploadedImage,
  canvas: CanvasSettings,
): Promise<Shape[]> {
  const img = await loadImage(image.dataUrl);
  const sampleW = 64;
  const sampleH = Math.round((img.height / img.width) * sampleW);
  const off = document.createElement('canvas');
  off.width = sampleW;
  off.height = sampleH;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.filter = `blur(${image.blur}px)`;
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

  const threshold = image.threshold;
  const cells: { x: number; y: number; w: number }[] = [];
  const step = 4;

  for (let y = 0; y < sampleH; y += step) {
    for (let x = 0; x < sampleW; x += step) {
      const i = (y * sampleW + x) * 4;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      // Dark regions become form
      if (lum < threshold) {
        cells.push({ x, y, w: 1 - lum });
      }
    }
  }

  if (!cells.length) {
    return createDefaultComposition(canvas, 99).slice(0, 2);
  }

  // Cluster into regions via simple grid binning
  const bins = new Map<string, { sx: number; sy: number; n: number; w: number }>();
  const binSize = 8;
  for (const c of cells) {
    const bx = Math.floor(c.x / binSize);
    const by = Math.floor(c.y / binSize);
    const key = `${bx},${by}`;
    const prev = bins.get(key) ?? { sx: 0, sy: 0, n: 0, w: 0 };
    bins.set(key, {
      sx: prev.sx + c.x,
      sy: prev.sy + c.y,
      n: prev.n + 1,
      w: prev.w + c.w,
    });
  }

  const clusters = [...bins.entries()]
    .map(([, v]) => ({
      x: v.sx / v.n,
      y: v.sy / v.n,
      weight: v.w / v.n,
      count: v.n,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.round(3 + image.influence * 4));

  const scaleX = canvas.width / sampleW;
  const scaleY = canvas.height / sampleH;
  const rng = mulberry32(cells.length * 13 + Math.round(image.influence * 100));
  const influence = clamp(image.influence, 0.15, 1);

  return clusters.map((c, i) => {
    const base = 40 + c.count * 3 * influence;
    const w = clamp(base * (0.9 + rng() * 0.5) * scaleX * 0.35, 48, canvas.width * 0.55);
    const h = clamp(base * (0.85 + rng() * 0.55) * scaleY * 0.35, 48, canvas.height * 0.5);
    const sx = clamp(c.x * scaleX - w / 2, 0, canvas.width - w);
    const sy = clamp(c.y * scaleY - h / 2, 0, canvas.height - h);
    return createShape(
      {
        x: sx,
        y: sy,
        width: w,
        height: h,
        name: `Trace ${i + 1}`,
        fill: canvas.shapeColor,
        opacity: clamp(0.75 + c.weight * 0.25, 0.7, 1),
      },
      canvas.style,
      canvas.softness,
      rng,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function regenerateComposition(
  canvas: CanvasSettings,
  seed?: number,
): Shape[] {
  return createDefaultComposition(canvas, seed ?? Math.floor(Math.random() * 100000));
}

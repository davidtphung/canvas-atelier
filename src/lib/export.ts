import { saveAs } from 'file-saver';
import type { AnimationSettings, CanvasSettings, GridSettings, Shape, UploadedImage } from '../types';
import { shapeToPath } from './geometry';

export type RenderScene = {
  canvas: CanvasSettings;
  grid: GridSettings;
  shapes: Shape[];
  image?: UploadedImage | null;
  animation?: AnimationSettings;
  time?: number;
};

function buildSvgMarkup(
  scene: RenderScene,
  width: number,
  height: number,
  options?: { animate?: boolean },
): string {
  const { canvas, grid, shapes, image, time = 0, animation } = scene;
  const scaleX = width / canvas.width;
  const scaleY = height / canvas.height;
  const morphAmp = animation?.morph && canvas.alive ? canvas.aliveIntensity : 0;
  const driftAmp = animation?.drift && canvas.alive ? canvas.aliveIntensity : 0;
  const phase = time;

  const gridOpacity = grid.visible ? Math.min(1, grid.opacity * 1.05) : 0;
  const spacing = grid.spacing * ((scaleX + scaleY) / 2);

  let gridLines = '';
  if (gridOpacity > 0) {
    const lines: string[] = [];
    for (let x = 0; x <= width; x += spacing) {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(26,26,26,${gridOpacity})" stroke-width="1"/>`,
      );
    }
    for (let y = 0; y <= height; y += spacing) {
      lines.push(
        `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(26,26,26,${gridOpacity})" stroke-width="1"/>`,
      );
    }
    const shimmer =
      options?.animate && animation?.gridShimmer
        ? ` opacity="${0.08 + Math.sin(phase * Math.PI * 2) * 0.04}"`
        : '';
    gridLines = `<g${shimmer}>${lines.join('')}</g>`;
  }

  let imageLayer = '';
  if (image && image.role !== 'mask') {
    const iw = image.width * image.scale * scaleX;
    const ih = image.height * image.scale * scaleY;
    const ix = image.x * scaleX;
    const iy = image.y * scaleY;
    imageLayer = `<image href="${image.dataUrl}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" opacity="${image.opacity}" style="mix-blend-mode:${image.blendMode}" transform="rotate(${image.rotation} ${ix + iw / 2} ${iy + ih / 2})" preserveAspectRatio="xMidYMid meet" />`;
  }

  // Parent shapes with cutout children via mask
  const byParent = new Map<string, Shape[]>();
  const roots: Shape[] = [];
  for (const s of shapes) {
    if (s.hidden) continue;
    if (s.parentId && s.booleanOp === 'subtract') {
      const list = byParent.get(s.parentId) ?? [];
      list.push(s);
      byParent.set(s.parentId, list);
    } else if (s.kind !== 'cutout') {
      roots.push(s);
    }
  }

  const shapeMarkup = roots
    .map((s, idx) => {
      const driftX =
        driftAmp > 0 ? Math.sin(phase * Math.PI * 2 + idx) * 4 * driftAmp * scaleX : 0;
      const driftY =
        driftAmp > 0 ? Math.cos(phase * Math.PI * 2 + idx * 0.7) * 3 * driftAmp * scaleY : 0;
      const local: Shape = {
        ...s,
        x: 0,
        y: 0,
        width: s.width * scaleX,
        height: s.height * scaleY,
      };
      const d = shapeToPath(local, phase, morphAmp);
      const tx = s.x * scaleX + driftX;
      const ty = s.y * scaleY + driftY;
      const cutouts = byParent.get(s.id) ?? [];
      const fill = adjustContrast(s.fill, canvas.contrast);

      if (cutouts.length) {
        const maskId = `mask-${s.id}`;
        const holes = cutouts
          .map((c) => {
            const cl: Shape = {
              ...c,
              x: (c.x - s.x) * scaleX,
              y: (c.y - s.y) * scaleY,
              width: c.width * scaleX,
              height: c.height * scaleY,
            };
            const cd = shapeToPath(cl, phase, morphAmp * 0.8);
            return `<path d="${cd}" fill="black"/>`;
          })
          .join('');
        return `
          <mask id="${maskId}">
            <rect x="0" y="0" width="${local.width}" height="${local.height}" fill="white"/>
            ${holes}
          </mask>
          <g transform="translate(${tx} ${ty}) rotate(${s.rotation} ${local.width / 2} ${local.height / 2})">
            <path d="${d}" fill="${fill}" opacity="${s.opacity}" mask="url(#${maskId})"/>
          </g>`;
      }

      return `<g transform="translate(${tx} ${ty}) rotate(${s.rotation} ${local.width / 2} ${local.height / 2})">
        <path d="${d}" fill="${fill}" opacity="${s.opacity}"/>
      </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${canvas.background}"/>
  ${gridLines}
  ${imageLayer}
  ${shapeMarkup}
</svg>`;
}

function adjustContrast(hex: string, contrast: number): string {
  // Keep charcoal forms; slight contrast via opacity handled elsewhere
  void contrast;
  return hex;
}

export async function exportPng(
  scene: RenderScene,
  width: number,
  height: number,
  filename: string,
): Promise<void> {
  const blob = await renderSceneToBlob(scene, width, height, 0);
  saveAs(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
}

export async function renderSceneToBlob(
  scene: RenderScene,
  width: number,
  height: number,
  time: number,
): Promise<Blob> {
  const svg = buildSvgMarkup({ ...scene, time }, width, height, { animate: true });
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadHtmlImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unsupported');
    ctx.fillStyle = scene.canvas.background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
        'image/png',
      );
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterize SVG'));
    img.src = src;
  });
}

export type VideoExportProgress = {
  phase: 'preparing' | 'recording' | 'encoding' | 'done' | 'error';
  progress: number;
  message: string;
  format?: 'mp4' | 'webm';
};

/**
 * Record animated scene via MediaRecorder.
 * Prefers MP4 when the browser supports it; falls back to WebM.
 */
export async function exportVideo(
  scene: RenderScene,
  options: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    filename: string;
    onProgress?: (p: VideoExportProgress) => void;
  },
): Promise<{ format: 'mp4' | 'webm'; blob: Blob }> {
  const { width, height, duration, fps, filename, onProgress } = options;
  const report = (p: VideoExportProgress) => onProgress?.(p);

  report({ phase: 'preparing', progress: 0.05, message: 'Preparing animation…' });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');

  const stream = canvas.captureStream(fps);
  const mp4Type = 'video/mp4';
  const webmVp9 = 'video/webm;codecs=vp9';
  const webmVp8 = 'video/webm;codecs=vp8';
  const webm = 'video/webm';

  let mimeType = webm;
  let format: 'mp4' | 'webm' = 'webm';

  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported(mp4Type)) {
      mimeType = mp4Type;
      format = 'mp4';
    } else if (MediaRecorder.isTypeSupported(webmVp9)) {
      mimeType = webmVp9;
    } else if (MediaRecorder.isTypeSupported(webmVp8)) {
      mimeType = webmVp8;
    } else if (MediaRecorder.isTypeSupported(webm)) {
      mimeType = webm;
    }
  } else {
    throw new Error('MediaRecorder is not available in this browser');
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => reject(new Error('Recording failed'));
  });

  report({
    phase: 'recording',
    progress: 0.1,
    message: `Recording ${format.toUpperCase()}…`,
    format,
  });
  recorder.start(100);

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDuration = 1000 / fps;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const blob = await renderSceneToBlob({ ...scene, time: t }, width, height, t);
    const frameUrl = URL.createObjectURL(blob);
    try {
      const img = await loadHtmlImage(frameUrl);
      ctx.fillStyle = scene.canvas.background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(frameUrl);
    }

    report({
      phase: 'recording',
      progress: 0.1 + (i / totalFrames) * 0.8,
      message: `Frame ${i + 1} of ${totalFrames}`,
      format,
    });

    await wait(frameDuration * 0.85);
  }

  report({ phase: 'encoding', progress: 0.92, message: 'Finalizing…', format });
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  const videoBlob = await stopped;
  const ext = format === 'mp4' ? 'mp4' : 'webm';
  const name = filename.replace(/\.(mp4|webm)$/i, '') + `.${ext}`;
  saveAs(videoBlob, name);

  report({ phase: 'done', progress: 1, message: `Saved ${name}`, format });
  return { format, blob: videoBlob };
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

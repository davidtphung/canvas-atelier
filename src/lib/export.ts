import { saveAs } from 'file-saver';
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  canEncodeVideo,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
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
      const fill = s.fill;

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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  await drawSceneToCanvas(ctx, scene, width, height, time);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
      'image/png',
    );
  });
  return blob;
}

/** Draw one animation frame onto an existing 2D context */
export async function drawSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  width: number,
  height: number,
  time: number,
): Promise<void> {
  const svg = buildSvgMarkup({ ...scene, time }, width, height, { animate: true });
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadHtmlImage(url);
    ctx.fillStyle = scene.canvas.background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
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

/** H.264 requires even dimensions */
function evenDim(n: number): number {
  const v = Math.max(2, Math.round(n));
  return v % 2 === 0 ? v : v - 1;
}

/**
 * Export animated scene as QuickTime-compatible H.264 MP4 via WebCodecs + Mediabunny.
 * Falls back to WebM only when H.264 is unavailable (with correct .webm extension).
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
  const report = (p: VideoExportProgress) => options.onProgress?.(p);

  const width = evenDim(Math.min(options.width, 1280));
  const height = evenDim(Math.min(options.height, 1600));
  const duration = Math.max(0.5, options.duration);
  const fps = Math.min(60, Math.max(12, Math.round(options.fps)));
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDuration = 1 / fps;
  const baseName = options.filename.replace(/\.(mp4|webm|mov)$/i, '');

  report({ phase: 'preparing', progress: 0.04, message: 'Checking H.264 support…' });

  // Prefer AVC (H.264) — plays in QuickTime, Finder, iOS, Safari
  const canAvc = await canEncodeVideo('avc', { width, height });
  const codec =
    (await getFirstEncodableVideoCodec(
      canAvc ? ['avc'] : ['avc', 'hevc'],
      { width, height },
    )) ?? null;

  if (codec === 'avc' || codec === 'hevc') {
    return encodeMp4WithMediabunny({
      scene,
      width,
      height,
      fps,
      totalFrames,
      frameDuration,
      codec,
      baseName,
      report,
    });
  }

  // Fallback: real WebM (never mislabel as .mp4)
  report({
    phase: 'preparing',
    progress: 0.06,
    message: 'H.264 unavailable — recording WebM…',
    format: 'webm',
  });
  return encodeWebmFallback({
    scene,
    width,
    height,
    fps,
    totalFrames,
    frameDuration,
    baseName,
    report,
  });
}

async function encodeMp4WithMediabunny(opts: {
  scene: RenderScene;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  frameDuration: number;
  codec: 'avc' | 'hevc';
  baseName: string;
  report: (p: VideoExportProgress) => void;
}): Promise<{ format: 'mp4'; blob: Blob }> {
  const { scene, width, height, totalFrames, frameDuration, codec, baseName, report } = opts;

  report({
    phase: 'preparing',
    progress: 0.08,
    message: `Encoding H.264 MP4 (${width}×${height})…`,
    format: 'mp4',
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas unsupported');

  // fastStart: 'in-memory' puts moov atom first — critical for QuickTime / progressive play
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({
      fastStart: 'in-memory',
    }),
    target,
  });

  const videoSource = new CanvasSource(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
    // Keyframe every ~1s for scrubbing
    keyFrameInterval: 1,
  });
  output.addVideoTrack(videoSource, { frameRate: opts.fps });

  await output.start();

  for (let i = 0; i < totalFrames; i++) {
    const t = totalFrames <= 1 ? 0 : i / (totalFrames - 1);
    await drawSceneToCanvas(ctx, { ...scene, time: t }, width, height, t);

    const timestamp = i * frameDuration;
    await videoSource.add(timestamp, frameDuration);

    report({
      phase: 'recording',
      progress: 0.1 + (i / totalFrames) * 0.8,
      message: `Encoding frame ${i + 1} of ${totalFrames}`,
      format: 'mp4',
    });

    // Yield so UI stays responsive
    if (i % 3 === 0) await wait(0);
  }

  report({ phase: 'encoding', progress: 0.93, message: 'Finalizing MP4…', format: 'mp4' });
  await output.finalize();

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength < 32) {
    throw new Error('MP4 encode produced an empty file');
  }

  // Validate ftyp box is present (real MP4, not WebM mislabeled)
  const head = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  const asText = String.fromCharCode(...head.slice(4, 8));
  if (asText !== 'ftyp') {
    throw new Error('Encoded file is not a valid MP4 (missing ftyp)');
  }

  const blob = new Blob([buffer], { type: 'video/mp4' });
  const name = `${baseName}.mp4`;
  saveAs(blob, name);

  report({
    phase: 'done',
    progress: 1,
    message: `Saved ${name} (H.264 · QuickTime ready)`,
    format: 'mp4',
  });
  return { format: 'mp4', blob };
}

/** Last-resort WebM when WebCodecs H.264 is unavailable */
async function encodeWebmFallback(opts: {
  scene: RenderScene;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  frameDuration: number;
  baseName: string;
  report: (p: VideoExportProgress) => void;
}): Promise<{ format: 'webm'; blob: Blob }> {
  const { scene, width, height, fps, totalFrames, baseName, report } = opts;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video export is not supported in this browser');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas unsupported');

  const stream = canvas.captureStream(0); // manual frame requests
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };

  const mimeCandidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType =
    mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('WebM recording failed'));
  });

  report({
    phase: 'recording',
    progress: 0.1,
    message: 'Recording WebM (install Chrome/Edge for MP4)…',
    format: 'webm',
  });
  recorder.start(100);

  for (let i = 0; i < totalFrames; i++) {
    const t = totalFrames <= 1 ? 0 : i / (totalFrames - 1);
    await drawSceneToCanvas(ctx, { ...scene, time: t }, width, height, t);
    track.requestFrame?.();

    report({
      phase: 'recording',
      progress: 0.1 + (i / totalFrames) * 0.8,
      message: `Frame ${i + 1} of ${totalFrames}`,
      format: 'webm',
    });
    // Pace roughly to fps so captureStream samples the frame
    await wait(1000 / fps);
  }

  // Hold last frame briefly
  await wait(120);
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  await stopped;

  const blob = new Blob(chunks, { type: 'video/webm' });
  if (blob.size < 64) throw new Error('WebM recording was empty');

  const name = `${baseName}.webm`;
  saveAs(blob, name);

  report({
    phase: 'done',
    progress: 1,
    message: `Saved ${name} (WebM — use VLC if needed)`,
    format: 'webm',
  });
  return { format: 'webm', blob };
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

import { useEffect, useId, useRef, useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { exportPng, exportVideo, type VideoExportProgress } from '../lib/export';
import { downloadJson } from '../lib/export';
import { setLastExportMeta, getLastExportMeta } from '../lib/storage';
import { EXPORT_PRESETS, type ExportSizePreset } from '../types';
import { formatPhysicalLabel } from '../lib/canvasFormats';
import { Icons } from './icons';
import './ExportDialog.css';

export function ExportDialog() {
  const open = useStudioStore((s) => s.exportOpen);
  const setExportOpen = useStudioStore((s) => s.setExportOpen);
  const getDocument = useStudioStore((s) => s.getDocument);
  const projectName = useStudioStore((s) => s.projectName);
  const studioCanvas = useStudioStore((s) => s.canvas);
  const animation = useStudioStore((s) => s.animation);
  const updateAnimation = useStudioStore((s) => s.updateAnimation);
  const toast = useStudioStore((s) => s.toast);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [preset, setPreset] = useState<ExportSizePreset | 'canvas'>('canvas');
  const [customW, setCustomW] = useState(2400);
  const [customH, setCustomH] = useState(3600);
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);
  const [lastMeta, setLastMeta] = useState(getLastExportMeta());

  useEffect(() => {
    if (open) {
      setFilename(slugify(projectName) || 'canvas-atelier');
      setLastMeta(getLastExportMeta());
      closeRef.current?.focus();
    }
  }, [open, projectName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setExportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, setExportOpen]);

  if (!open) return null;

  const canvasExportScale = 3; // ~print-friendly from studio pixels
  const dims =
    preset === 'custom'
      ? { width: customW, height: customH }
      : preset === 'canvas'
        ? {
            width: studioCanvas.width * canvasExportScale,
            height: studioCanvas.height * canvasExportScale,
          }
        : EXPORT_PRESETS[preset];

  const scene = () => {
    const doc = getDocument();
    return {
      canvas: doc.canvas,
      grid: doc.grid,
      shapes: doc.shapes,
      image: doc.image,
      animation: doc.animation,
    };
  };

  const onPng = async () => {
    setBusy(true);
    setProgress({ phase: 'preparing', progress: 0.2, message: 'Rendering PNG…' });
    try {
      await exportPng(scene(), dims.width, dims.height, filename);
      const meta = { filename: `${filename}.png`, format: 'png', at: new Date().toISOString() };
      setLastExportMeta(meta);
      setLastMeta(meta);
      toast('PNG exported');
      setProgress({ phase: 'done', progress: 1, message: 'PNG saved' });
    } catch {
      toast('PNG export failed');
      setProgress({ phase: 'error', progress: 0, message: 'Export failed' });
    } finally {
      setBusy(false);
    }
  };

  const onVideo = async () => {
    setBusy(true);
    setProgress({ phase: 'preparing', progress: 0.05, message: 'Preparing…' });
    try {
      // Enable motion for export
      const base = scene();
      const live = {
        ...base,
        canvas: { ...base.canvas, alive: true },
        animation: {
          ...base.animation,
          morph: true,
          drift: true,
          gridShimmer: true,
        },
      };
      const result = await exportVideo(live, {
        width: Math.min(dims.width, 1280),
        height: Math.min(dims.height, 1600),
        duration: animation.duration,
        fps: animation.fps,
        filename,
        onProgress: setProgress,
      });
      const meta = {
        filename: `${filename}.${result.format}`,
        format: result.format,
        at: new Date().toISOString(),
      };
      setLastExportMeta(meta);
      setLastMeta(meta);
      toast(
        result.format === 'mp4'
          ? 'MP4 exported'
          : 'WebM exported (MP4 not supported in this browser)',
      );
    } catch (err) {
      console.error(err);
      toast('Video export failed — try a shorter duration');
      setProgress({ phase: 'error', progress: 0, message: 'Video export failed' });
    } finally {
      setBusy(false);
    }
  };

  const onProject = () => {
    downloadJson(getDocument(), `${filename}.canvas-atelier.json`);
    toast('Project file downloaded');
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) setExportOpen(false);
      }}
    >
      <div
        className="modal modal-wide export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="export-header">
          <div>
            <h2 id={titleId}>Export</h2>
            <p className="lede">Crisp stills, living motion, or a full project package.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-icon"
            aria-label="Close export"
            disabled={busy}
            onClick={() => setExportOpen(false)}
          >
            <Icons.close />
          </button>
        </div>

        <div className="export-grid">
          <div className="field">
            <label className="field-label" htmlFor="export-name">
              Filename
            </label>
            <input
              id="export-name"
              className="input"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="field-label">Size</span>
            <div className="segmented export-presets" role="group" aria-label="Export size">
              <button
                type="button"
                aria-pressed={preset === 'canvas'}
                onClick={() => setPreset('canvas')}
                title={formatPhysicalLabel(studioCanvas.formatId, studioCanvas.orientation)}
              >
                canvas
              </button>
              {(Object.keys(EXPORT_PRESETS) as Array<keyof typeof EXPORT_PRESETS>).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={preset === key}
                  onClick={() => setPreset(key)}
                >
                  {key}
                </button>
              ))}
              <button type="button" aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}>
                custom
              </button>
            </div>
          </div>
          {preset === 'canvas' && (
            <p className="export-dims micro">
              Matches paint canvas · {formatPhysicalLabel(studioCanvas.formatId, studioCanvas.orientation)} ·{' '}
              {studioCanvas.orientation}
            </p>
          )}

          {preset === 'custom' && (
            <div className="export-custom-dims">
              <div className="field">
                <label className="field-label" htmlFor="ew">
                  Width
                </label>
                <input
                  id="ew"
                  className="input"
                  type="number"
                  min={320}
                  max={4800}
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="eh">
                  Height
                </label>
                <input
                  id="eh"
                  className="input"
                  type="number"
                  min={320}
                  max={4800}
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <p className="export-dims micro">
            Output {dims.width} × {dims.height}
            {preset !== 'custom' &&
            preset !== 'canvas' &&
            preset !== 'social'
              ? ` · ${EXPORT_PRESETS[preset as keyof typeof EXPORT_PRESETS].label}`
              : ''}
          </p>

          <div className="export-video-controls">
            <p className="section-label">Motion export</p>
            <div className="export-custom-dims">
              <div className="field">
                <label className="field-label" htmlFor="dur">
                  Duration (s)
                </label>
                <input
                  id="dur"
                  className="input"
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={animation.duration}
                  onChange={(e) => updateAnimation({ duration: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="fps">
                  Frame rate
                </label>
                <select
                  id="fps"
                  className="select"
                  value={animation.fps}
                  onChange={(e) => updateAnimation({ fps: Number(e.target.value) })}
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
            </div>
          </div>

          {progress && (
            <div className="export-progress" role="status" aria-live="polite">
              <div className="export-progress-bar">
                <div style={{ width: `${Math.round(progress.progress * 100)}%` }} />
              </div>
              <p>{progress.message}</p>
            </div>
          )}

          {lastMeta && (
            <p className="export-last micro">
              Last export: {lastMeta.filename} · {new Date(lastMeta.at).toLocaleString()}
            </p>
          )}
        </div>

        <div className="modal-actions export-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onProject}>
            Project JSON
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onVideo()}>
            MP4 / WebM
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onPng()}>
            <Icons.download />
            PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

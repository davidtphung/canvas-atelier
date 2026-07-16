import { useMemo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import type { ArtStyle, CanvasOrientation } from '../types';
import {
  CANVAS_FORMATS,
  familyLabel,
  formatPhysicalLabel,
  getFormat,
} from '../lib/canvasFormats';
import { Icons } from './icons';
import './Inspector.css';

const STYLES: { id: ArtStyle; label: string }[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'bold', label: 'Bold' },
  { id: 'playful', label: 'Playful' },
  { id: 'architectural', label: 'Architectural' },
  { id: 'soft-surreal', label: 'Soft surreal' },
];

const ORIENTATIONS: { id: CanvasOrientation; label: string }[] = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'square', label: 'Square' },
];

export function Inspector() {
  const canvas = useStudioStore((s) => s.canvas);
  const grid = useStudioStore((s) => s.grid);
  const shapes = useStudioStore((s) => s.shapes);
  const selectedIds = useStudioStore((s) => s.selectedIds);
  const updateCanvas = useStudioStore((s) => s.updateCanvas);
  const updateGrid = useStudioStore((s) => s.updateGrid);
  const updateShape = useStudioStore((s) => s.updateShape);
  const pushHistory = useStudioStore((s) => s.pushHistory);
  const setStyle = useStudioStore((s) => s.setStyle);
  const setCanvasFormat = useStudioStore((s) => s.setCanvasFormat);
  const setOrientation = useStudioStore((s) => s.setOrientation);
  const refinePrompt = useStudioStore((s) => s.refinePrompt);
  const setRefinePrompt = useStudioStore((s) => s.setRefinePrompt);
  const applyNlRefine = useStudioStore((s) => s.applyNlRefine);
  const lastRefineSummary = useStudioStore((s) => s.lastRefineSummary);
  const setAlive = useStudioStore((s) => s.setAlive);
  const clearCanvas = useStudioStore((s) => s.clearCanvas);
  const newProject = useStudioStore((s) => s.newProject);
  const regenerate = useStudioStore((s) => s.regenerate);
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);
  const toggleInspector = useStudioStore((s) => s.toggleInspector);
  const activePanel = useStudioStore((s) => s.activePanel);

  const format = getFormat(canvas.formatId);
  const isSquareFormat = Boolean(format.square);
  const physical = formatPhysicalLabel(canvas.formatId, canvas.orientation);

  const formatsByFamily = useMemo(() => {
    const groups = {
      us: [] as typeof CANVAS_FORMATS,
      european: [] as typeof CANVAS_FORMATS,
      square: [] as typeof CANVAS_FORMATS,
      paper: [] as typeof CANVAS_FORMATS,
    };
    for (const f of CANVAS_FORMATS) {
      groups[f.family].push(f);
    }
    return groups;
  }, []);

  const selected = shapes.find((s) => s.id === selectedIds[0]);

  if (!inspectorOpen && activePanel !== 'layers' && activePanel !== 'upload') {
    return null;
  }

  // Layers/upload panels render separately; this is properties inspector
  if (activePanel === 'layers' || activePanel === 'upload') {
    return null;
  }

  return (
    <aside className="inspector panel-scroll" aria-label="Inspector">
      <div className="inspector-header">
        <p className="section-label">Inspector</p>
        <button
          type="button"
          className="btn btn-icon desktop-only"
          aria-label="Collapse inspector"
          onClick={() => toggleInspector()}
        >
          <Icons.chevronRight />
        </button>
      </div>

      <section className="inspector-section">
        <p className="section-label">Start</p>
        <div className="start-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => clearCanvas()}
          >
            Empty canvas
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%' }}
            onClick={() => newProject({ empty: true })}
          >
            New blank project
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%' }}
            onClick={() => regenerate()}
          >
            Starter composition
          </button>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          Empty paper is ready for spilled ink. Starter loads a curated modernist layout.
        </p>
      </section>

      <section className="inspector-section">
        <p className="section-label">Paint canvas</p>
        <p className="hint canvas-size-hint">
          Real atelier stretcher sizes. Composition remaps when you change format or orientation.
        </p>

        <div className="field">
          <span className="field-label">Orientation</span>
          <div className="segmented orientation-seg" role="group" aria-label="Canvas orientation">
            {ORIENTATIONS.map((o) => {
              const lockedSquare = isSquareFormat && o.id !== 'square';
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={canvas.orientation === o.id}
                  disabled={lockedSquare}
                  title={
                    lockedSquare
                      ? 'This format is square'
                      : o.id === 'square'
                        ? 'Use a square atelier size'
                        : o.label
                  }
                  onClick={() => {
                    if (o.id === 'square' && !isSquareFormat) {
                      // Switch to a square format when user picks square orientation
                      setCanvasFormat('sq-20');
                      return;
                    }
                    setOrientation(o.id);
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="canvas-format">
            Format
          </label>
          <select
            id="canvas-format"
            className="select"
            value={canvas.formatId}
            onChange={(e) => setCanvasFormat(e.target.value as typeof canvas.formatId)}
            aria-describedby="canvas-physical"
          >
            {(
              ['us', 'european', 'square', 'paper'] as const
            ).map((family) => (
              <optgroup key={family} label={familyLabel(family)}>
                {formatsByFamily[family].map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                    {f.note ? ` — ${f.note}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <p id="canvas-physical" className="canvas-physical" role="status">
          <span className="micro">Physical</span>
          <strong>{physical}</strong>
          <span className="field-value">
            Studio {canvas.width} × {canvas.height}px
          </span>
        </p>
      </section>

      <section className="inspector-section">
        <p className="section-label">Style</p>
        <div className="style-grid" role="listbox" aria-label="Composition style">
          {STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              role="option"
              aria-selected={canvas.style === st.id}
              className={`style-chip ${canvas.style === st.id ? 'is-active' : ''}`}
              onClick={() => setStyle(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </section>

      <section className="inspector-section">
        <p className="section-label">Composition</p>
        <Field
          label="Density"
          value={canvas.density}
          min={0.3}
          max={1.5}
          step={0.05}
          onChange={(v) => updateCanvas({ density: v })}
        />
        <Field
          label="Softness"
          value={canvas.softness}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateCanvas({ softness: v })}
        />
        <Field
          label="Contrast"
          value={canvas.contrast}
          min={0.4}
          max={1.4}
          step={0.05}
          onChange={(v) => updateCanvas({ contrast: v })}
        />
        <Field
          label="Negative space"
          value={canvas.negativeSpace}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => updateCanvas({ negativeSpace: v })}
        />
        <div className="field-row toggle-row">
          <span className="field-label">Freeform</span>
          <Toggle
            checked={canvas.freeform}
            onChange={(v) => updateCanvas({ freeform: v })}
            label="Freeform placement"
          />
        </div>
        <div className="field-row toggle-row">
          <span className="field-label">Alive</span>
          <Toggle
            checked={canvas.alive}
            onChange={(v) => setAlive(v)}
            label="Make composition feel alive"
          />
        </div>
        {canvas.alive && (
          <Field
            label="Motion intensity"
            value={canvas.aliveIntensity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => updateCanvas({ aliveIntensity: v })}
          />
        )}
      </section>

      <section className="inspector-section">
        <p className="section-label">Grid</p>
        <div className="field-row toggle-row">
          <span className="field-label">Visible</span>
          <Toggle
            checked={grid.visible}
            onChange={(v) => updateGrid({ visible: v })}
            label="Show grid"
          />
        </div>
        <div className="field-row toggle-row">
          <span className="field-label">Snap</span>
          <Toggle
            checked={grid.snap}
            onChange={(v) => updateGrid({ snap: v })}
            label="Snap to grid"
          />
        </div>
        <Field
          label="Spacing"
          value={grid.spacing}
          min={16}
          max={64}
          step={4}
          display={`${grid.spacing}px`}
          onChange={(v) => updateGrid({ spacing: v })}
        />
        <Field
          label="Opacity"
          value={grid.opacity}
          min={0.02}
          max={0.3}
          step={0.01}
          onChange={(v) => updateGrid({ opacity: v })}
        />
      </section>

      {selected && (
        <section className="inspector-section">
          <p className="section-label">Selected form</p>
          <p className="selected-name">{selected.name}</p>
          <Field
            label="Opacity"
            value={selected.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => {
              pushHistory();
              updateShape(selected.id, { opacity: v });
            }}
          />
          <Field
            label="Rotation"
            value={selected.rotation}
            min={-180}
            max={180}
            step={1}
            display={`${Math.round(selected.rotation)}°`}
            onChange={(v) => {
              pushHistory();
              updateShape(selected.id, { rotation: v });
            }}
          />
          <Field
            label="Width"
            value={selected.width}
            min={32}
            max={canvas.width}
            step={1}
            display={`${Math.round(selected.width)}`}
            onChange={(v) => {
              pushHistory();
              updateShape(selected.id, { width: v });
            }}
          />
          <Field
            label="Height"
            value={selected.height}
            min={32}
            max={canvas.height}
            step={1}
            display={`${Math.round(selected.height)}`}
            onChange={(v) => {
              pushHistory();
              updateShape(selected.id, { height: v });
            }}
          />
        </section>
      )}

      <section className="inspector-section refine-section">
        <p className="section-label">Refine with language</p>
        <p className="hint">
          Try “more asymmetric”, “increase negative space”, or “calmer and more museum-like”.
        </p>
        <textarea
          className="textarea"
          rows={3}
          value={refinePrompt}
          onChange={(e) => setRefinePrompt(e.target.value)}
          placeholder="Describe the adjustment…"
          aria-label="Natural language refinement"
        />
        <button
          type="button"
          className="btn btn-primary refine-btn"
          onClick={() => applyNlRefine()}
        >
          <Icons.spark />
          Apply refinement
        </button>
        {lastRefineSummary && (
          <p className="refine-summary" role="status">
            {lastRefineSummary}
          </p>
        )}
      </section>
    </aside>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <label className="field-label">{label}</label>
        <span className="field-value">{display ?? value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

import { useStudioStore } from '../store/useStudioStore';
import type { CanvasOrientation } from '../types';
import {
  CANVAS_FORMATS,
  formatPhysicalLabel,
  getFormat,
} from '../lib/canvasFormats';
import './CanvasFormatBar.css';

const ORIENTATIONS: { id: CanvasOrientation; label: string; glyph: string }[] = [
  { id: 'portrait', label: 'Portrait', glyph: '▯' },
  { id: 'landscape', label: 'Landscape', glyph: '▭' },
  { id: 'square', label: 'Square', glyph: '□' },
];

/** Compact canvas format + orientation control under the hero canvas */
export function CanvasFormatBar() {
  const canvas = useStudioStore((s) => s.canvas);
  const setCanvasFormat = useStudioStore((s) => s.setCanvasFormat);
  const setOrientation = useStudioStore((s) => s.setOrientation);
  const format = getFormat(canvas.formatId);
  const isSquareFormat = Boolean(format.square);
  const physical = formatPhysicalLabel(canvas.formatId, canvas.orientation);

  // Popular quick picks
  const quick = CANVAS_FORMATS.filter((f) =>
    ['us-11x14', 'us-16x20', 'us-18x24', 'us-24x36', 'eu-f20', 'sq-20', 'a2'].includes(
      f.id,
    ),
  );

  return (
    <div className="format-bar" role="region" aria-label="Paint canvas size">
      <div className="format-bar-row">
        <span className="micro format-bar-kicker">Canvas</span>
        <div className="segmented format-orient" role="group" aria-label="Orientation">
          {ORIENTATIONS.map((o) => {
            const locked = isSquareFormat && o.id !== 'square';
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={canvas.orientation === o.id}
                aria-label={o.label}
                disabled={locked}
                title={o.label}
                onClick={() => {
                  if (o.id === 'square' && !isSquareFormat) {
                    setCanvasFormat('sq-20');
                    return;
                  }
                  setOrientation(o.id);
                }}
              >
                <span aria-hidden="true">{o.glyph}</span>
                <span className="format-orient-label">{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="format-bar-row format-bar-sizes">
        {quick.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`format-chip ${canvas.formatId === f.id ? 'is-active' : ''}`}
            aria-pressed={canvas.formatId === f.id}
            onClick={() => setCanvasFormat(f.id)}
            title={f.note ?? f.label}
          >
            {f.label}
          </button>
        ))}
        <label className="format-more">
          <span className="sr-only">All canvas formats</span>
          <select
            className="select format-select"
            value={canvas.formatId}
            onChange={(e) => setCanvasFormat(e.target.value as typeof canvas.formatId)}
            aria-label="All paint canvas formats"
          >
            {CANVAS_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.family === 'us'
                  ? 'US'
                  : f.family === 'european'
                    ? 'Figure'
                    : f.family === 'square'
                      ? 'Square'
                      : 'Paper'}{' '}
                · {f.label}
                {f.note ? ` (${f.note})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="format-bar-meta micro">{physical}</p>
    </div>
  );
}

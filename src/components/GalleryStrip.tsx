import { useMemo } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { createDefaultComposition, regenerateComposition } from '../lib/artEngine';
import './GalleryStrip.css';

/** History / variation rail — quick style previews */
export function GalleryStrip() {
  const canvas = useStudioStore((s) => s.canvas);
  const setStyle = useStudioStore((s) => s.setStyle);
  const regenerate = useStudioStore((s) => s.regenerate);
  const library = useStudioStore((s) => s.library);
  const loadProject = useStudioStore((s) => s.loadProject);

  const previews = useMemo(() => {
    const styles = ['calm', 'bold', 'playful', 'architectural', 'soft-surreal'] as const;
    return styles.map((style, i) => {
      const c = { ...canvas, style, width: 80, height: 100 };
      const shapes =
        style === canvas.style
          ? createDefaultComposition({ ...c, width: 80, height: 100 }, 42 + i)
          : regenerateComposition({ ...c, width: 80, height: 100 }, 100 + i);
      return { style, shapes };
    });
  }, [canvas.style]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="gallery-strip" role="region" aria-label="Style variations and history">
      <div className="gallery-label micro">Variations</div>
      <div className="gallery-scroll">
        {previews.map((p) => (
          <button
            key={p.style}
            type="button"
            className={`gallery-card ${canvas.style === p.style ? 'is-active' : ''}`}
            onClick={() => setStyle(p.style)}
            aria-label={`Apply ${p.style} style`}
            aria-pressed={canvas.style === p.style}
          >
            <svg viewBox="0 0 80 100" className="gallery-thumb" aria-hidden="true">
              <rect width="80" height="100" fill="var(--canvas-paper, #F4EFE6)" />
              {p.shapes.slice(0, 4).map((s) => (
                <ellipse
                  key={s.id}
                  cx={s.x + s.width / 2}
                  cy={s.y + s.height / 2}
                  rx={s.width / 2}
                  ry={s.height / 2}
                  fill="var(--canvas-ink, #1A1A1A)"
                  opacity={s.opacity}
                />
              ))}
            </svg>
            <span className="gallery-card-label">{p.style}</span>
          </button>
        ))}

        <button
          type="button"
          className="gallery-card gallery-shuffle"
          onClick={() => regenerate()}
          aria-label="Shuffle new composition"
        >
          <span className="gallery-shuffle-icon">↻</span>
          <span className="gallery-card-label">Shuffle</span>
        </button>

        {library.slice(0, 4).map((p) => (
          <button
            key={p.id}
            type="button"
            className="gallery-card gallery-saved"
            onClick={() => loadProject(p.id)}
            aria-label={`Open ${p.name}`}
          >
            <span className="gallery-saved-mark" />
            <span className="gallery-card-label">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

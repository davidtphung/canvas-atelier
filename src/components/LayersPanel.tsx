import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './SidePanel.css';

export function LayersPanel() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const shapes = useStudioStore((s) => s.shapes);
  const selectedIds = useStudioStore((s) => s.selectedIds);
  const select = useStudioStore((s) => s.select);
  const toggleLock = useStudioStore((s) => s.toggleLock);
  const toggleHide = useStudioStore((s) => s.toggleHide);
  const reorderShape = useStudioStore((s) => s.reorderShape);
  const deleteSelected = useStudioStore((s) => s.deleteSelected);
  const duplicateSelected = useStudioStore((s) => s.duplicateSelected);
  const setPanel = useStudioStore((s) => s.setPanel);

  if (activePanel !== 'layers') return null;

  const ordered = [...shapes].reverse();

  return (
    <aside className="side-panel panel-scroll" aria-label="Layers">
      <div className="side-panel-header">
        <p className="section-label">Layers</p>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Close layers"
          onClick={() => setPanel(null)}
        >
          <Icons.close />
        </button>
      </div>

      <ul className="layer-list">
        {ordered.map((s) => {
          const selected = selectedIds.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`layer-item ${selected ? 'is-selected' : ''} ${s.hidden ? 'is-hidden' : ''}`}
                onClick={(e) => select([s.id], e.shiftKey || e.metaKey)}
                aria-current={selected ? 'true' : undefined}
              >
                <span className="layer-swatch" aria-hidden="true" />
                <span className="layer-meta">
                  <span className="layer-name">{s.name}</span>
                  <span className="layer-kind micro">{s.kind}</span>
                </span>
              </button>
              <div className="layer-actions">
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={s.hidden ? 'Show' : 'Hide'}
                  onClick={() => toggleHide(s.id)}
                >
                  {s.hidden ? <Icons.eyeOff /> : <Icons.eye />}
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label={s.locked ? 'Unlock' : 'Lock'}
                  onClick={() => toggleLock(s.id)}
                >
                  {s.locked ? <Icons.lock /> : <Icons.unlock />}
                </button>
                <button
                  type="button"
                  className="btn btn-icon"
                  aria-label="Bring forward"
                  onClick={() => reorderShape(s.id, 'up')}
                >
                  <Icons.chevronRight style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="side-panel-footer">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!selectedIds.length}
          onClick={() => duplicateSelected()}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!selectedIds.length}
          onClick={() => deleteSelected()}
        >
          Delete
        </button>
      </div>
    </aside>
  );
}

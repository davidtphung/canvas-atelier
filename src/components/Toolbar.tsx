import { useStudioStore } from '../store/useStudioStore';
import type { Tool } from '../types';
import { Icons } from './icons';
import './Toolbar.css';

/** Essential tools only - advanced ops live in Settings */
const TOOLS: { id: Tool; label: string; icon: keyof typeof Icons }[] = [
  { id: 'ink', label: 'Paint', icon: 'ink' },
  { id: 'select', label: 'Select', icon: 'select' },
  { id: 'hand', label: 'Move', icon: 'hand' },
];

export function Toolbar() {
  const tool = useStudioStore((s) => s.tool);
  const setTool = useStudioStore((s) => s.setTool);
  const setPanel = useStudioStore((s) => s.setPanel);
  const activePanel = useStudioStore((s) => s.activePanel);
  const grid = useStudioStore((s) => s.grid);
  const updateGrid = useStudioStore((s) => s.updateGrid);
  const deleteSelected = useStudioStore((s) => s.deleteSelected);
  const selectedIds = useStudioStore((s) => s.selectedIds);
  const toggleInspector = useStudioStore((s) => s.toggleInspector);
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);
  const canvas = useStudioStore((s) => s.canvas);
  const setAlive = useStudioStore((s) => s.setAlive);

  return (
    <nav className="toolbar" aria-label="Editing tools">
      <div className="toolbar-group" role="toolbar" aria-label="Primary tools">
        {TOOLS.map((t) => {
          const Icon = Icons[t.icon];
          return (
            <button
              key={t.id}
              type="button"
              className="btn btn-icon"
              aria-label={t.label}
              aria-pressed={tool === t.id}
              title={t.label}
              onClick={() => setTool(t.id)}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group" role="toolbar" aria-label="View">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Toggle grid"
          aria-pressed={grid.visible}
          title="Grid"
          onClick={() => updateGrid({ visible: !grid.visible })}
        >
          <Icons.grid />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Layers"
          aria-pressed={activePanel === 'layers'}
          title="Layers"
          onClick={() => setPanel('layers')}
        >
          <Icons.layers />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Upload"
          aria-pressed={activePanel === 'upload'}
          title="Upload"
          onClick={() => setPanel('upload')}
        >
          <Icons.upload />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label={canvas.alive ? 'Stop motion' : 'Alive motion'}
          aria-pressed={canvas.alive}
          title="Alive"
          onClick={() => setAlive(!canvas.alive)}
        >
          <Icons.alive />
        </button>
      </div>

      <div className="toolbar-spacer" aria-hidden="true" />

      <div className="toolbar-group" role="toolbar" aria-label="More">
        <button
          type="button"
          className="btn btn-icon mobile-only"
          aria-label="Settings"
          aria-pressed={inspectorOpen}
          onClick={() => toggleInspector()}
        >
          <Icons.settings />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Delete selection"
          disabled={!selectedIds.length}
          title="Delete"
          onClick={() => deleteSelected()}
        >
          <Icons.trash />
        </button>
      </div>
    </nav>
  );
}

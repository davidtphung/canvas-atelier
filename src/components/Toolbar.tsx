import { useStudioStore } from '../store/useStudioStore';
import type { Tool } from '../types';
import { Icons } from './icons';
import './Toolbar.css';

const TOOLS: { id: Tool; label: string; icon: keyof typeof Icons }[] = [
  { id: 'select', label: 'Select & throw', icon: 'select' },
  { id: 'blob', label: 'Paint throw', icon: 'blob' },
  { id: 'subtract', label: 'Subtract', icon: 'subtract' },
  { id: 'union', label: 'Union', icon: 'union' },
  { id: 'hand', label: 'Move ink', icon: 'hand' },
];

export function Toolbar() {
  const tool = useStudioStore((s) => s.tool);
  const setTool = useStudioStore((s) => s.setTool);
  const setPanel = useStudioStore((s) => s.setPanel);
  const activePanel = useStudioStore((s) => s.activePanel);
  const grid = useStudioStore((s) => s.grid);
  const updateGrid = useStudioStore((s) => s.updateGrid);
  const addBlob = useStudioStore((s) => s.addBlob);
  const duplicateSelected = useStudioStore((s) => s.duplicateSelected);
  const deleteSelected = useStudioStore((s) => s.deleteSelected);
  const selectedIds = useStudioStore((s) => s.selectedIds);
  const toggleInspector = useStudioStore((s) => s.toggleInspector);
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);

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
              onClick={() => {
                if (t.id === 'blob') addBlob();
                else setTool(t.id);
              }}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group" role="toolbar" aria-label="View and panels">
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
          onClick={() => setPanel('layers')}
        >
          <Icons.layers />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Upload image"
          aria-pressed={activePanel === 'upload'}
          onClick={() => setPanel('upload')}
        >
          <Icons.upload />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Timeline"
          aria-pressed={activePanel === 'timeline'}
          onClick={() => setPanel('timeline')}
        >
          <Icons.play />
        </button>
        <button
          type="button"
          className="btn btn-icon desktop-only"
          aria-label="Toggle inspector"
          aria-pressed={inspectorOpen}
          onClick={() => toggleInspector()}
        >
          <Icons.chevronRight />
        </button>
      </div>

      <div className="toolbar-divider desktop-only" aria-hidden="true" />

      <div className="toolbar-group desktop-only" role="toolbar" aria-label="Selection actions">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Duplicate"
          disabled={!selectedIds.length}
          onClick={() => duplicateSelected()}
        >
          <Icons.duplicate />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Delete"
          disabled={!selectedIds.length}
          onClick={() => deleteSelected()}
        >
          <Icons.trash />
        </button>
      </div>
    </nav>
  );
}

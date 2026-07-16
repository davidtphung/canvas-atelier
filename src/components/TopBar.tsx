import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './TopBar.css';

export function TopBar() {
  const projectName = useStudioStore((s) => s.projectName);
  const saveProject = useStudioStore((s) => s.saveProject);
  const newProject = useStudioStore((s) => s.newProject);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const past = useStudioStore((s) => s.past);
  const future = useStudioStore((s) => s.future);
  const setExportOpen = useStudioStore((s) => s.setExportOpen);
  const setPanel = useStudioStore((s) => s.setPanel);
  const setOnboarding = useStudioStore((s) => s.setOnboarding);
  const regenerate = useStudioStore((s) => s.regenerate);
  const canvas = useStudioStore((s) => s.canvas);
  const setAlive = useStudioStore((s) => s.setAlive);

  return (
    <header className="topbar" role="banner">
      <div className="topbar-brand">
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-blob" />
        </div>
        <div className="brand-text">
          <p className="brand-name">Canvas Atelier</p>
          <p className="brand-sub">Generative poster studio</p>
        </div>
      </div>

      <div className="topbar-project">
        <label className="sr-only" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          className="project-name-input"
          value={projectName}
          onChange={(e) =>
            useStudioStore.setState({
              projectName: e.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          onBlur={() => useStudioStore.getState().scheduleAutosave()}
        />
      </div>

      <div className="topbar-actions" role="toolbar" aria-label="Project actions">
        <button type="button" className="btn btn-icon desktop-only" onClick={() => undo()} disabled={!past.length} aria-label="Undo">
          <Icons.undo />
        </button>
        <button type="button" className="btn btn-icon desktop-only" onClick={() => redo()} disabled={!future.length} aria-label="Redo">
          <Icons.redo />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setAlive(!canvas.alive)}
          aria-label={canvas.alive ? 'Stop living motion' : 'Make it feel alive'}
          aria-pressed={canvas.alive}
          title="Make it feel alive"
        >
          <Icons.alive />
        </button>
        <button type="button" className="btn btn-icon desktop-only" onClick={() => regenerate()} aria-label="Regenerate composition">
          <Icons.spark />
        </button>
        <button type="button" className="btn btn-icon" onClick={() => setPanel('library')} aria-label="Project library">
          <Icons.library />
        </button>
        <button type="button" className="btn btn-icon" onClick={() => setPanel('a11y')} aria-label="Accessibility settings">
          <Icons.settings />
        </button>
        <button type="button" className="btn btn-icon" onClick={() => setOnboarding(true)} aria-label="Help and tour">
          <Icons.help />
        </button>
        <button type="button" className="btn btn-ghost desktop-only" onClick={() => newProject()}>
          New
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => saveProject()}>
          <Icons.save />
          <span className="desktop-only">Save</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setExportOpen(true)}>
          <Icons.download />
          Export
        </button>
      </div>
    </header>
  );
}

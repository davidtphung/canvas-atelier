import { Link, useLocation } from 'react-router-dom';
import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import { ViewCounter } from './ViewCounter';
import './TopBar.css';

export function TopBar() {
  const location = useLocation();
  const isAbout =
    location.pathname === '/about' ||
    location.pathname.endsWith('/about') ||
    location.pathname === '/donate' ||
    location.pathname.endsWith('/donate');
  const projectName = useStudioStore((s) => s.projectName);
  const saveProject = useStudioStore((s) => s.saveProject);
  const clearCanvas = useStudioStore((s) => s.clearCanvas);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const past = useStudioStore((s) => s.past);
  const future = useStudioStore((s) => s.future);
  const setExportOpen = useStudioStore((s) => s.setExportOpen);
  const setPanel = useStudioStore((s) => s.setPanel);
  const toggleInspector = useStudioStore((s) => s.toggleInspector);
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);
  const theme = useStudioStore((s) => s.a11y.theme);
  const cycleTheme = useStudioStore((s) => s.cycleTheme);

  const ThemeIcon =
    theme === 'dark' ? Icons.moon : theme === 'light' ? Icons.sun : Icons.system;
  const themeLabel =
    theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'System theme';

  return (
    <header className="topbar" role="banner">
      <div className="topbar-brand">
        <Link to="/" className="brand-home" aria-label="Canvas Atelier home">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-blob" />
          </div>
          <div className="brand-text">
            <p className="brand-name">Canvas Atelier</p>
            <p className="brand-sub desktop-only">NLT143 RESEARCH</p>
          </div>
        </Link>
      </div>

      {!isAbout ? (
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
      ) : (
        <div className="topbar-project">
          <p className="topbar-page-label micro">About</p>
        </div>
      )}

      <div className="topbar-actions" role="toolbar" aria-label="Project actions">
        <nav className="topbar-nav" aria-label="Site">
          <Link
            to="/"
            className={`btn btn-ghost topbar-nav-link ${!isAbout ? 'is-active' : ''}`}
            aria-current={!isAbout ? 'page' : undefined}
          >
            Studio
          </Link>
          <Link
            to="/about"
            className={`btn btn-ghost topbar-nav-link ${isAbout ? 'is-active' : ''}`}
            aria-current={isAbout ? 'page' : undefined}
          >
            About
          </Link>
        </nav>

        <div className="topbar-views desktop-only" aria-label="Site visits">
          <ViewCounter variant="inline" />
        </div>

        <button
          type="button"
          className="btn btn-icon"
          onClick={() => cycleTheme()}
          aria-label={themeLabel}
          title={themeLabel}
        >
          <ThemeIcon />
        </button>

        {!isAbout && (
          <>
            <button
              type="button"
              className="btn btn-icon desktop-only"
              onClick={() => undo()}
              disabled={!past.length}
              aria-label="Undo"
            >
              <Icons.undo />
            </button>
            <button
              type="button"
              className="btn btn-icon desktop-only"
              onClick={() => redo()}
              disabled={!future.length}
              aria-label="Redo"
            >
              <Icons.redo />
            </button>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => clearCanvas()}
              aria-label="Empty canvas"
              title="Empty canvas"
            >
              <Icons.empty />
            </button>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => toggleInspector()}
              aria-label="Settings"
              aria-pressed={inspectorOpen}
              title="Canvas settings"
            >
              <Icons.settings />
            </button>
            <button
              type="button"
              className="btn btn-icon desktop-only"
              onClick={() => setPanel('library')}
              aria-label="Library"
              title="Projects"
            >
              <Icons.library />
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => saveProject()}>
              <Icons.save />
              <span className="label-desktop">Save</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setExportOpen(true)}>
              <Icons.download />
              <span className="label-desktop">Export</span>
            </button>
          </>
        )}

        {isAbout && (
          <Link to="/" className="btn btn-primary">
            Studio
          </Link>
        )}
      </div>
    </header>
  );
}

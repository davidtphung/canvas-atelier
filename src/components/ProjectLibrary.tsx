import { useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { parseProjectFile } from '../lib/storage';
import { Icons } from './icons';
import './SidePanel.css';
import './ProjectLibrary.css';

export function ProjectLibrary() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const library = useStudioStore((s) => s.library);
  const loadProject = useStudioStore((s) => s.loadProject);
  const deleteLibraryProject = useStudioStore((s) => s.deleteLibraryProject);
  const duplicateProject = useStudioStore((s) => s.duplicateProject);
  const importProject = useStudioStore((s) => s.importProject);
  const setPanel = useStudioStore((s) => s.setPanel);
  const toast = useStudioStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);

  if (activePanel !== 'library') return null;

  return (
    <aside className="side-panel panel-scroll library-panel" aria-label="Project library">
      <div className="side-panel-header">
        <p className="section-label">Library</p>
        <button type="button" className="btn btn-icon" aria-label="Close library" onClick={() => setPanel(null)}>
          <Icons.close />
        </button>
      </div>

      <p className="hint">Saved versions live on this device. Export a project file to share or archive.</p>

      <div className="library-actions">
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => duplicateProject()}>
          Duplicate current
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              importProject(parseProjectFile(text));
              setPanel(null);
            } catch {
              toast('Invalid project file');
            }
          }}
        />
      </div>

      {library.length === 0 ? (
        <p className="empty-state">No saved projects yet. Use Save to keep a version.</p>
      ) : (
        <ul className="library-list">
          {library.map((p) => (
            <li key={p.id} className="library-item">
              <button type="button" className="library-open" onClick={() => { loadProject(p.id); setPanel(null); }}>
                <span className="library-name">{p.name}</span>
                <span className="micro">
                  v{p.version} · {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-icon"
                aria-label={`Delete ${p.name}`}
                onClick={() => deleteLibraryProject(p.id)}
              >
                <Icons.trash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

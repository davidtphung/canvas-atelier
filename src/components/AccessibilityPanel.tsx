import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './SidePanel.css';

export function AccessibilityPanel() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const a11y = useStudioStore((s) => s.a11y);
  const updateA11y = useStudioStore((s) => s.updateA11y);
  const setPanel = useStudioStore((s) => s.setPanel);
  const setAlive = useStudioStore((s) => s.setAlive);

  if (activePanel !== 'a11y') return null;

  return (
    <aside className="side-panel panel-scroll" aria-label="Accessibility settings">
      <div className="side-panel-header">
        <p className="section-label">Accessibility</p>
        <button type="button" className="btn btn-icon" aria-label="Close accessibility" onClick={() => setPanel(null)}>
          <Icons.close />
        </button>
      </div>

      <p className="hint" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--charcoal-mid)' }}>
        Clarity, predictability, and graceful adaptation — controls stay usable with keyboard, touch, and assistive tech.
      </p>

      <ToggleRow
        label="Reduce motion"
        description="Simplifies animation and disables living poster mode."
        checked={a11y.reducedMotion}
        onChange={(v) => {
          updateA11y({ reducedMotion: v });
          if (v) {
            setAlive(false);
            useStudioStore.getState().setTimelinePlaying(false);
          }
        }}
      />
      <ToggleRow
        label="High contrast"
        description="Stronger edges and ink for drafting clarity."
        checked={a11y.highContrast}
        onChange={(v) => updateA11y({ highContrast: v })}
      />
      <ToggleRow
        label="Larger targets"
        description="Increases control size for comfortable touch."
        checked={a11y.largeTargets}
        onChange={(v) => {
          updateA11y({ largeTargets: v });
          document.documentElement.dataset.largeTargets = String(v);
        }}
      />
      <ToggleRow
        label="Announce actions"
        description="Shows toast confirmations for edits and exports."
        checked={a11y.announceActions}
        onChange={(v) => updateA11y({ announceActions: v })}
      />

      <div className="a11y-keys">
        <p className="section-label">Keyboard</p>
        <ul>
          <li><kbd>V</kbd> Select</li>
          <li><kbd>B</kbd> Add form</li>
          <li><kbd>⌘/Ctrl Z</kbd> Undo</li>
          <li><kbd>⌘/Ctrl ⇧ Z</kbd> Redo</li>
          <li><kbd>⌘/Ctrl S</kbd> Save</li>
          <li><kbd>⌘/Ctrl E</kbd> Export</li>
          <li><kbd>Delete</kbd> Remove selection</li>
          <li><kbd>Arrows</kbd> Nudge</li>
        </ul>
      </div>
    </aside>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="a11y-row">
      <div>
        <p className="a11y-label">{label}</p>
        <p className="a11y-desc">{description}</p>
      </div>
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
    </div>
  );
}

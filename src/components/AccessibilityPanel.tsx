import { useStudioStore } from '../store/useStudioStore';
import type { ThemePreference } from '../types';
import { Icons } from './icons';
import './SidePanel.css';

const THEMES: { id: ThemePreference; label: string; hint: string }[] = [
  { id: 'light', label: 'Light', hint: 'Cream paper studio' },
  { id: 'dark', label: 'Dark', hint: 'Museum night' },
  { id: 'system', label: 'System', hint: 'Match device' },
];

export function AccessibilityPanel() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const a11y = useStudioStore((s) => s.a11y);
  const updateA11y = useStudioStore((s) => s.updateA11y);
  const setTheme = useStudioStore((s) => s.setTheme);
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

      <div className="field" style={{ gap: '0.5rem' }}>
        <p className="section-label">Appearance</p>
        <div className="segmented" role="group" aria-label="Color theme" style={{ width: '100%' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              style={{ flex: 1 }}
              aria-pressed={a11y.theme === t.id}
              title={t.hint}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--charcoal-mid)' }}>
          Light keeps archival cream paper. Dark uses warm charcoal with cream ink forms.
        </p>
      </div>

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
          <li><kbd>D</kbd> Cycle theme</li>
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

import { useStudioStore } from '../store/useStudioStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { TopBar } from '../components/TopBar';
import { Toolbar } from '../components/Toolbar';
import { ArtCanvas } from '../components/ArtCanvas';
import { Inspector } from '../components/Inspector';
import { LayersPanel } from '../components/LayersPanel';
import { UploadPanel } from '../components/UploadPanel';
import { ProjectLibrary } from '../components/ProjectLibrary';
import { AccessibilityPanel } from '../components/AccessibilityPanel';
import { Timeline } from '../components/Timeline';
import { ExportDialog } from '../components/ExportDialog';
import { Onboarding } from '../components/Onboarding';
import { ToastRegion } from '../components/ToastRegion';
import { ViewCounter } from '../components/ViewCounter';

/**
 * Full-viewport studio shell:
 * top bar + tool rail + canvas fills remaining space.
 * Settings live in drawers; no page scroll.
 */
export function StudioPage() {
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);
  const a11y = useStudioStore((s) => s.a11y);
  const activePanel = useStudioStore((s) => s.activePanel);

  useKeyboardShortcuts();

  const showInspector =
    inspectorOpen &&
    activePanel !== 'layers' &&
    activePanel !== 'upload' &&
    activePanel !== 'library' &&
    activePanel !== 'a11y' &&
    activePanel !== 'timeline';

  return (
    <div
      className={`app-shell studio-shell ${a11y.largeTargets ? 'large-targets' : ''}`}
      data-panel={activePanel ?? 'none'}
    >
      <a href="#main-canvas" className="skip-link">
        Skip to canvas
      </a>

      <TopBar />

      <div className={`app-main ${showInspector ? 'inspector-open' : ''}`}>
        <Toolbar />

        <main className="app-stage" id="main-canvas">
          <div className="stage-canvas-wrap">
            <ArtCanvas />
            <div className="stage-timeline-float">
              <Timeline compact />
            </div>
          </div>
        </main>

        {showInspector && <Inspector />}

        <LayersPanel />
        <UploadPanel />
        <ProjectLibrary />
        <AccessibilityPanel />
      </div>

      {/* Mobile / always-visible visit chip (desktop also shows in top bar) */}
      <div className="studio-view-chip" aria-hidden={false}>
        <ViewCounter variant="inline" />
      </div>

      <ExportDialog />
      <Onboarding />
      <ToastRegion />
    </div>
  );
}

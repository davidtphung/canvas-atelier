import { useEffect } from 'react';
import { useStudioStore } from './store/useStudioStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { applyDocumentTheme, resolveTheme } from './lib/theme';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { ArtCanvas } from './components/ArtCanvas';
import { Inspector } from './components/Inspector';
import { LayersPanel } from './components/LayersPanel';
import { UploadPanel } from './components/UploadPanel';
import { ProjectLibrary } from './components/ProjectLibrary';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { Timeline } from './components/Timeline';
import { GalleryStrip } from './components/GalleryStrip';
import { ExportDialog } from './components/ExportDialog';
import { Onboarding } from './components/Onboarding';
import { ToastRegion } from './components/ToastRegion';
import { HeroIntro } from './components/HeroIntro';
import { CanvasFormatBar } from './components/CanvasFormatBar';
import { ViewCounter } from './components/ViewCounter';
import './App.css';

export default function App() {
  const init = useStudioStore((s) => s.init);
  const inspectorOpen = useStudioStore((s) => s.inspectorOpen);
  const a11y = useStudioStore((s) => s.a11y);
  const activePanel = useStudioStore((s) => s.activePanel);

  useKeyboardShortcuts();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(a11y.highContrast);
    document.documentElement.dataset.reducedMotion = String(a11y.reducedMotion);
    document.documentElement.dataset.largeTargets = String(a11y.largeTargets);
    applyDocumentTheme(resolveTheme(a11y.theme));
  }, [a11y]);

  // Follow OS theme changes when preference is "system"
  useEffect(() => {
    if (a11y.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => useStudioStore.getState().syncSystemTheme();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [a11y.theme]);

  const showInspector =
    inspectorOpen &&
    activePanel !== 'layers' &&
    activePanel !== 'upload' &&
    activePanel !== 'library' &&
    activePanel !== 'a11y';

  return (
    <div
      className={`app-shell ${a11y.largeTargets ? 'large-targets' : ''}`}
      data-panel={activePanel ?? 'none'}
    >
      <a href="#main-canvas" className="skip-link">
        Skip to canvas
      </a>

      <TopBar />

      <div className={`app-main ${showInspector ? 'inspector-open' : ''}`}>
        <Toolbar />

        <main className="app-stage" id="main-canvas">
          <HeroIntro />
          <ArtCanvas />
          <CanvasFormatBar />
          <Timeline />
          <GalleryStrip />
          <ViewCounter variant="plaque" />
        </main>

        {showInspector && <Inspector />}

        <LayersPanel />
        <UploadPanel />
        <ProjectLibrary />
        <AccessibilityPanel />
      </div>

      <ExportDialog />
      <Onboarding />
      <ToastRegion />
    </div>
  );
}

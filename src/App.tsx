import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useStudioStore } from './store/useStudioStore';
import { applyDocumentTheme, resolveTheme } from './lib/theme';
import { initPerfProfile } from './lib/perf';
import { StudioPage } from './pages/StudioPage';
import { AboutPage } from './pages/AboutPage';
import './App.css';

function ThemeBootstrap() {
  const init = useStudioStore((s) => s.init);
  const a11y = useStudioStore((s) => s.a11y);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => initPerfProfile(), []);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(a11y.highContrast);
    document.documentElement.dataset.reducedMotion = String(a11y.reducedMotion);
    document.documentElement.dataset.largeTargets = String(a11y.largeTargets);
    applyDocumentTheme(resolveTheme(a11y.theme));
  }, [a11y]);

  useEffect(() => {
    if (a11y.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => useStudioStore.getState().syncSystemTheme();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [a11y.theme]);

  return null;
}

export default function App() {
  // Vite base: '/' locally, '/canvas-atelier/' on GitHub Pages
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename === '/' ? undefined : basename}>
      <ThemeBootstrap />
      <Routes>
        <Route path="/" element={<StudioPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/donate" element={<Navigate to="/about?tab=donate" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

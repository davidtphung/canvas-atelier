import { useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) return;

      const mod = e.metaKey || e.ctrlKey;
      const store = useStudioStore.getState();

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y') && e.shiftKey) {
        e.preventDefault();
        store.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !e.shiftKey) {
        e.preventDefault();
        store.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        store.saveProject();
        return;
      }
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        store.setExportOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        store.duplicateSelected();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedIds.length) {
          e.preventDefault();
          store.deleteSelected();
        }
        return;
      }

      if (e.key === 'Escape') {
        store.clearSelection();
        store.setPanel(null);
        store.setExportOpen(false);
        return;
      }

      if (e.key === 'v' || e.key === 'V') store.setTool('select');
      if (e.key === 'b' || e.key === 'B') store.setTool('blob');
      if (e.key === 'h' || e.key === 'H') store.setTool('hand');
      if (e.key === 'g' || e.key === 'G') {
        store.updateGrid({ visible: !store.grid.visible });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

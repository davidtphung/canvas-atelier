import { useStudioStore } from '../store/useStudioStore';

export function ToastRegion() {
  const toasts = useStudioStore((s) => s.toasts);
  const dismissToast = useStudioStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-region" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <button
            type="button"
            className="toast-btn"
            onClick={() => dismissToast(t.id)}
            style={{ all: 'unset', cursor: 'pointer' }}
          >
            {t.message}
          </button>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './Timeline.css';

export function Timeline({ compact = false }: { compact?: boolean }) {
  const animation = useStudioStore((s) => s.animation);
  const updateAnimation = useStudioStore((s) => s.updateAnimation);
  const timelinePlaying = useStudioStore((s) => s.timelinePlaying);
  const timelineTime = useStudioStore((s) => s.timelineTime);
  const setTimelineTime = useStudioStore((s) => s.setTimelineTime);
  const setTimelinePlaying = useStudioStore((s) => s.setTimelinePlaying);
  const togglePlayPause = useStudioStore((s) => s.togglePlayPause);
  const a11y = useStudioStore((s) => s.a11y);
  const rafRef = useRef(0);

  // Advance time only while playing; cancel cleanly on pause
  useEffect(() => {
    if (!timelinePlaying || a11y.reducedMotion) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    let last = performance.now();
    const tick = (now: number) => {
      // Re-check store each frame so pause is immediate
      const state = useStudioStore.getState();
      if (!state.timelinePlaying || state.a11y.reducedMotion) {
        rafRef.current = 0;
        return;
      }
      const dt = (now - last) / 1000;
      last = now;
      const duration = Math.max(0.1, state.animation.duration);
      const next = (state.timelineTime + dt / duration) % 1;
      setTimelineTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [timelinePlaying, a11y.reducedMotion, setTimelineTime]);

  return (
    <div
      className={`timeline-bar ${compact ? 'is-compact' : 'is-expanded'}`}
      role="region"
      aria-label="Animation timeline"
    >
      <div className="timeline-controls">
        <button
          type="button"
          className="btn btn-icon"
          aria-label={timelinePlaying ? 'Pause' : 'Play'}
          aria-pressed={timelinePlaying}
          onClick={() => togglePlayPause()}
        >
          {timelinePlaying ? <Icons.pause /> : <Icons.play />}
        </button>

        <label className="timeline-scrub">
          <span className="sr-only">Timeline position</span>
          <input
            type="range"
            className="range"
            min={0}
            max={1}
            step={0.001}
            value={timelineTime}
            onChange={(e) => {
              // Scrub freezes playback
              setTimelinePlaying(false);
              setTimelineTime(Number(e.target.value));
            }}
          />
        </label>

        <span className="timeline-time field-value">
          {(timelineTime * animation.duration).toFixed(1)}s
        </span>
      </div>

      {!compact && (
        <div className="timeline-toggles">
          <label className="check">
            <input
              type="checkbox"
              checked={animation.morph}
              onChange={(e) => updateAnimation({ morph: e.target.checked })}
            />
            Morph
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={animation.drift}
              onChange={(e) => updateAnimation({ drift: e.target.checked })}
            />
            Drift
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={animation.gridShimmer}
              onChange={(e) => updateAnimation({ gridShimmer: e.target.checked })}
            />
            Grid shimmer
          </label>
        </div>
      )}
    </div>
  );
}

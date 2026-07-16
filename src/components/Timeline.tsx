import { useEffect } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './Timeline.css';

export function Timeline() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const animation = useStudioStore((s) => s.animation);
  const updateAnimation = useStudioStore((s) => s.updateAnimation);
  const timelinePlaying = useStudioStore((s) => s.timelinePlaying);
  const setTimelinePlaying = useStudioStore((s) => s.setTimelinePlaying);
  const timelineTime = useStudioStore((s) => s.timelineTime);
  const setTimelineTime = useStudioStore((s) => s.setTimelineTime);
  const canvas = useStudioStore((s) => s.canvas);
  const setAlive = useStudioStore((s) => s.setAlive);
  const a11y = useStudioStore((s) => s.a11y);
  const setPanel = useStudioStore((s) => s.setPanel);

  useEffect(() => {
    if (!timelinePlaying || a11y.reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = (useStudioStore.getState().timelineTime + dt / animation.duration) % 1;
      setTimelineTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timelinePlaying, animation.duration, a11y.reducedMotion, setTimelineTime]);

  // Keep alive mode in sync with play
  useEffect(() => {
    if (canvas.alive && !a11y.reducedMotion && !timelinePlaying) {
      setTimelinePlaying(true);
    }
  }, [canvas.alive, a11y.reducedMotion, timelinePlaying, setTimelinePlaying]);

  if (activePanel !== 'timeline' && !canvas.alive) return null;

  const visible = activePanel === 'timeline';

  return (
    <div className={`timeline-bar ${visible ? 'is-expanded' : 'is-compact'}`} role="region" aria-label="Animation timeline">
      {visible && (
        <div className="timeline-header">
          <p className="section-label">Timeline</p>
          <button type="button" className="btn btn-icon" aria-label="Close timeline" onClick={() => setPanel(null)}>
            <Icons.close />
          </button>
        </div>
      )}

      <div className="timeline-controls">
        <button
          type="button"
          className="btn btn-icon"
          aria-label={timelinePlaying ? 'Pause' : 'Play'}
          onClick={() => {
            if (a11y.reducedMotion) {
              useStudioStore.getState().toast('Motion reduced in accessibility settings');
              return;
            }
            const next = !timelinePlaying;
            setTimelinePlaying(next);
            if (next) setAlive(true);
          }}
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
              setTimelinePlaying(false);
              setTimelineTime(Number(e.target.value));
            }}
          />
        </label>

        <span className="timeline-time field-value">
          {(timelineTime * animation.duration).toFixed(1)}s
        </span>
      </div>

      {visible && (
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

import { useEffect, useState } from 'react';
import { formatViewCount, recordSiteView } from '../lib/viewCounter';
import './ViewCounter.css';

type Props = {
  /** Compact inline (top bar) vs footer plaque */
  variant?: 'inline' | 'plaque';
};

/** Shared cache so multiple ViewCounter mounts don't flash different states */
let sharedCount: number | null = null;
let sharedSource: 'remote' | 'local' | 'loading' = 'loading';
let sharedPromise: Promise<{ count: number; source: 'remote' | 'local' }> | null = null;

function loadViews() {
  if (sharedPromise) return sharedPromise;
  sharedPromise = recordSiteView().then((result) => {
    sharedCount = result.count;
    sharedSource = result.source;
    return result;
  });
  return sharedPromise;
}

export function ViewCounter({ variant = 'plaque' }: Props) {
  const [count, setCount] = useState<number | null>(sharedCount);
  const [source, setSource] = useState<'remote' | 'local' | 'loading'>(sharedSource);

  useEffect(() => {
    let cancelled = false;
    void loadViews().then((result) => {
      if (cancelled) return;
      setCount(result.count);
      setSource(result.source);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = count == null ? '…' : formatViewCount(count);

  if (variant === 'inline') {
    return (
      <p
        className="view-counter view-counter--inline"
        title={
          source === 'local'
            ? 'Visit count (this device until network sync)'
            : 'Total studio visits'
        }
        aria-live="polite"
        aria-label={count == null ? 'Loading visit count' : `${label} studio visits`}
      >
        <span className="view-counter-dot" aria-hidden="true" />
        <span className="micro">Visits</span>
        <span className="view-counter-num">{label}</span>
      </p>
    );
  }

  return (
    <footer className="view-counter view-counter--plaque" aria-label="Site visit count">
      <div className="view-counter-plaque-inner">
        <span className="micro">Studio visits</span>
        <p className="view-counter-display" aria-live="polite">
          {label}
        </p>
        <span className="view-counter-note micro">
          {source === 'loading'
            ? 'Counting…'
            : source === 'local'
              ? 'This browser'
              : 'All visitors'}
        </span>
        <p className="site-credit">
          Built by{' '}
          <a
            href="https://x.com/davidtphung"
            target="_blank"
            rel="noopener noreferrer"
            className="site-credit-link"
          >
            David T Phung
          </a>
          {' · '}
          <a href="./about" className="site-credit-link site-credit-about">
            About
          </a>
          {' · '}
          <a href="./about?tab=donate" className="site-credit-link" title="Donate tab in About">
            Donate
          </a>
        </p>
      </div>
    </footer>
  );
}

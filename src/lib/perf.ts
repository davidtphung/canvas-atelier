/**
 * Runtime performance profile for Canvas Atelier.
 * Mobile / low-power devices get cheaper physics + no gooey SVG filter.
 */

export type PerfProfile = {
  /** Prefer lower frame cost */
  lowPower: boolean;
  /** Soft metaball SVG filter (very expensive on mobile GPUs) */
  gooFilter: boolean;
  /** Target physics render Hz when animating */
  renderHz: number;
  /** Soft-collide every N frames */
  collideEvery: number;
  /** Max soft-collide body pairs per frame */
  maxCollidePairs: number;
  /** Max simultaneous ink forms (paint auto-thins older dabs visually via fewer new ones) */
  maxInkShapes: number;
  /** Extra dab spacing multiplier while painting */
  dabSpacingScale: number;
  /** Skip proximity field when idle hover */
  ambientField: boolean;
  /** Slightly simpler blob silhouettes */
  simpleNodes: boolean;
};

let cached: PerfProfile | null = null;
let mqListenersAttached = false;

function detect(): PerfProfile {
  if (typeof window === 'undefined') {
    return {
      lowPower: false,
      gooFilter: true,
      renderHz: 60,
      collideEvery: 1,
      maxCollidePairs: 400,
      maxInkShapes: 80,
      dabSpacingScale: 1,
      ambientField: true,
      simpleNodes: false,
    };
  }

  const coarse =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches;
  const narrow = window.matchMedia('(max-width: 860px)').matches;
  const saveData =
    // @ts-expect-error navigator.connection is not always typed
    Boolean(navigator.connection?.saveData);
  const lowCpu =
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;
  // @ts-expect-error deviceMemory is Chromium-only
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;

  const lowPower = coarse || narrow || saveData || lowCpu || lowMem;

  return {
    lowPower,
    // Goo filter is the #1 mobile FPS killer (feGaussianBlur each frame)
    gooFilter: !lowPower,
    renderHz: lowPower ? 30 : 60,
    collideEvery: lowPower ? 2 : 1,
    maxCollidePairs: lowPower ? 48 : 280,
    maxInkShapes: lowPower ? 36 : 90,
    dabSpacingScale: lowPower ? 1.55 : 1,
    ambientField: !lowPower,
    simpleNodes: lowPower,
  };
}

export function getPerfProfile(): PerfProfile {
  if (!cached) cached = detect();
  return cached;
}

/** Refresh profile on viewport / input changes (call once at app boot). */
export function initPerfProfile(): () => void {
  if (typeof window === 'undefined') return () => {};
  cached = detect();
  if (mqListenersAttached) return () => {};
  mqListenersAttached = true;
  const mqs = [
    window.matchMedia('(pointer: coarse)'),
    window.matchMedia('(hover: none)'),
    window.matchMedia('(max-width: 860px)'),
  ];
  const onChange = () => {
    cached = detect();
  };
  for (const mq of mqs) {
    mq.addEventListener('change', onChange);
  }
  return () => {
    for (const mq of mqs) {
      mq.removeEventListener('change', onChange);
    }
    mqListenersAttached = false;
  };
}

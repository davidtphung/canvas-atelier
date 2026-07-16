/**
 * Global site view counter for static hosting (GitHub Pages).
 * Increments once per browser session; falls back gracefully offline.
 */

const SESSION_FLAG = 'canvas-atelier:view-session';
const LOCAL_TOTAL = 'canvas-atelier:view-total';
const NAMESPACE = 'davidtphung';
const KEY = 'canvas-atelier';

/** Free public hit API (Abacus) */
const HIT_URL = `https://abacus.jasoncameron.dev/hit/${NAMESPACE}/${KEY}`;
const GET_URL = `https://abacus.jasoncameron.dev/get/${NAMESPACE}/${KEY}`;

function readLocal(): number {
  try {
    const n = Number(localStorage.getItem(LOCAL_TOTAL) ?? '0');
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeLocal(n: number): void {
  try {
    localStorage.setItem(LOCAL_TOTAL, String(n));
  } catch {
    /* ignore quota */
  }
}

function parseValue(data: unknown): number | null {
  const n = Number((data as { value?: number })?.value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Dedupe concurrent calls (React StrictMode double-mount) */
let inflight: Promise<{ count: number; source: 'remote' | 'local' }> | null = null;

/**
 * Record a visit (once per tab session) and return the best-known total.
 */
export async function recordSiteView(): Promise<{
  count: number;
  source: 'remote' | 'local';
}> {
  if (inflight) return inflight;

  inflight = (async () => {
    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem(SESSION_FLAG) === '1';
    } catch {
      alreadyCounted = false;
    }

    // Mark session immediately so StrictMode remounts don't double-hit
    if (!alreadyCounted) {
      try {
        sessionStorage.setItem(SESSION_FLAG, '1');
      } catch {
        /* private mode */
      }
    }

    const url = alreadyCounted ? GET_URL : HIT_URL;
    const data = await fetchJson(url);
    const remote = data != null ? parseValue(data) : null;

    if (remote != null) {
      const next = Math.max(remote, readLocal());
      writeLocal(next);
      return { count: next, source: 'remote' as const };
    }

    // Offline / API failure — still track locally
    let local = readLocal();
    if (!alreadyCounted) {
      local += 1;
      writeLocal(local);
    }
    return { count: Math.max(local, 1), source: 'local' as const };
  })();

  try {
    return await inflight;
  } finally {
    // Keep inflight for a moment so remounts share the same result
    setTimeout(() => {
      inflight = null;
    }, 2000);
  }
}

export function formatViewCount(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

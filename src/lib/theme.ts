export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'canvas-atelier:theme';

export const THEME_CANVAS = {
  light: {
    background: '#F4EFE6',
    shapeColor: '#1A1A1A',
  },
  dark: {
    background: '#141210',
    shapeColor: '#EDE6D9',
  },
} as const;

const DEFAULT_FILLS = new Set([
  THEME_CANVAS.light.shapeColor.toLowerCase(),
  THEME_CANVAS.dark.shapeColor.toLowerCase(),
  '#1a1a1a',
  '#000000',
  '#ede6d9',
  '#f4efe6',
]);

const DEFAULT_BACKGROUNDS = new Set([
  THEME_CANVAS.light.background.toLowerCase(),
  THEME_CANVAS.dark.background.toLowerCase(),
  '#f4efe6',
  '#141210',
  '#121110',
]);

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

/** Apply resolved theme to document (CSS variables + meta) */
export function applyDocumentTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      resolved === 'dark' ? THEME_CANVAS.dark.background : THEME_CANVAS.light.background,
    );
  }

  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) {
    scheme.setAttribute('content', resolved);
  }
}

export function isDefaultFill(color: string | undefined): boolean {
  if (!color) return true;
  return DEFAULT_FILLS.has(color.toLowerCase());
}

export function isDefaultBackground(color: string | undefined): boolean {
  if (!color) return true;
  return DEFAULT_BACKGROUNDS.has(color.toLowerCase());
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
  // Cycle: system → light → dark → system
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}

export function themeLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'System';
  if (preference === 'light') return 'Light';
  return 'Dark';
}

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gemini_journal_theme';

export type AccentColor = 'violet' | 'ocean' | 'emerald' | 'rose' | 'amber';

export const ACCENT_STORAGE_KEY = 'gemini_journal_accent';
export const DEFAULT_ACCENT: AccentColor = 'violet';

export interface AccentOption {
  id: AccentColor;
  name: string;
  label: string;
  description: string;
  swatchHex: string;
  badgeBg: string;
  ringClass: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: 'violet',
    name: 'Violet',
    label: 'Violet',
    description: 'Indigo & purple reflective tones (default)',
    swatchHex: '#6366f1',
    badgeBg: 'bg-indigo-500',
    ringClass: 'ring-indigo-500',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    label: 'Ocean',
    description: 'Serene coastal blues for clear focus',
    swatchHex: '#0ea5e9',
    badgeBg: 'bg-sky-500',
    ringClass: 'ring-sky-500',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    label: 'Emerald',
    description: 'Vibrant organic greens for mindful balance',
    swatchHex: '#10b981',
    badgeBg: 'bg-emerald-500',
    ringClass: 'ring-emerald-500',
  },
  {
    id: 'rose',
    name: 'Rose',
    label: 'Rose',
    description: 'Warm, empathetic rose & crimson tones',
    swatchHex: '#f43f5e',
    badgeBg: 'bg-rose-500',
    ringClass: 'ring-rose-500',
  },
  {
    id: 'amber',
    name: 'Amber',
    label: 'Amber',
    description: 'Luminous gold & amber sunset highlights',
    swatchHex: '#f59e0b',
    badgeBg: 'bg-amber-500',
    ringClass: 'ring-amber-500',
  },
];

/**
 * Determines initial theme based on localStorage and system prefers-color-scheme
 */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    console.warn('[Theme] Could not read localStorage:', err);
  }
  return 'light';
}

/**
 * Applies the given theme to document.documentElement with the 'dark' class
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

/**
 * Saves and applies theme
 */
export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.warn('[Theme] Could not write to localStorage:', err);
  }
  applyTheme(theme);
}

/**
 * Determines initial accent based on localStorage
 */
export function getInitialAccent(): AccentColor {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null;
    if (saved && ['violet', 'ocean', 'emerald', 'rose', 'amber'].includes(saved)) {
      return saved;
    }
  } catch (err) {
    console.warn('[Theme] Could not read accent from localStorage:', err);
  }
  return DEFAULT_ACCENT;
}

/**
 * Applies the given accent to document.documentElement with data-accent
 */
export function applyAccent(accent: AccentColor): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
}

/**
 * Saves and applies accent
 */
export function setStoredAccent(accent: AccentColor): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch (err) {
    console.warn('[Theme] Could not write accent to localStorage:', err);
  }
  applyAccent(accent);
}


export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gemini_journal_theme';

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

// The inline script in index.html applies the saved theme before the app renders.
// Keep THEME_STORAGE_KEY in sync with that script.

export const THEMES = Object.freeze(['light', 'dark']);
export const THEME_STORAGE_KEY = 'bookstore.theme';

const isTheme = (value) => THEMES.includes(value);

// The theme already applied to <html>, falling back to the OS preference.
export function getInitialTheme() {
  if (typeof document === 'undefined') return 'light';
  const applied = document.documentElement.getAttribute('data-theme');
  if (isTheme(applied)) return applied;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Storage can be unavailable (private windows, blocked site data); the theme still applies.
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore: the choice just won't be remembered.
  }
}

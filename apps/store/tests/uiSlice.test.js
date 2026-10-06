import { describe, expect, it } from 'vitest';
import uiReducer, { selectTheme, themeSet, themeToggled } from '../src/features/ui/uiSlice.js';

describe('ui slice', () => {
  it('reads the initial theme from <html data-theme>', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    expect(uiReducer(undefined, { type: 'init' })).toEqual({ theme: 'dark' });
  });

  it('defaults to light when no theme is applied and dark mode is not preferred', () => {
    expect(uiReducer(undefined, { type: 'init' })).toEqual({ theme: 'light' });
  });

  it('toggles between light and dark', () => {
    expect(uiReducer({ theme: 'light' }, themeToggled())).toEqual({ theme: 'dark' });
    expect(uiReducer({ theme: 'dark' }, themeToggled())).toEqual({ theme: 'light' });
  });

  it('sets a valid theme and ignores unknown values', () => {
    expect(uiReducer({ theme: 'light' }, themeSet('dark'))).toEqual({ theme: 'dark' });
    expect(uiReducer({ theme: 'light' }, themeSet('sepia'))).toEqual({ theme: 'light' });
  });

  it('selects the theme', () => {
    expect(selectTheme({ ui: { theme: 'dark' } })).toBe('dark');
  });
});

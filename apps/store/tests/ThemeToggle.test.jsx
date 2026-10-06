import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ThemeToggle from '../src/components/ThemeToggle.jsx';
import { THEME_STORAGE_KEY } from '../src/lib/theme.js';
import { renderWithProviders } from './utils/renderWithProviders.jsx';

describe('ThemeToggle', () => {
  it('switches between light and dark and remembers the choice', async () => {
    const { user, store } = renderWithProviders(<ThemeToggle />, {
      preloadedState: { ui: { theme: 'light' } },
    });

    const toDark = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(toDark).toHaveAttribute('aria-pressed', 'false');

    await user.click(toDark);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(store.getState().ui.theme).toBe('dark');
    const toLight = screen.getByRole('button', { name: 'Switch to light theme' });
    expect(toLight).toHaveAttribute('aria-pressed', 'true');

    await user.click(toLight);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('starts from the theme already applied to the page', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    renderWithProviders(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });
});

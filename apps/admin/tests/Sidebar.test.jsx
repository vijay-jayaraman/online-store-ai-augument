import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS } from '../src/app/nav.js';
import { STORE_URL } from '../src/lib/config.js';
import { renderApp } from './utils/renderWithProviders.jsx';

const sidebarNav = () => screen.getByRole('navigation', { name: 'Admin navigation' });
const currentLinks = () =>
  within(sidebarNav())
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);

describe('admin sidebar', () => {
  it.each(NAV_ITEMS.map((item) => [item.label, item]))(
    'clicking "%s" shows the matching page',
    async (label, item) => {
      // Start on a different section so every click is a real navigation.
      const start = item.path === 'books' ? '/settings' : '/books';
      const { user, router } = renderApp(start);

      await user.click(within(sidebarNav()).getByRole('link', { name: label }));

      expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(`/${item.path}`);
      expect(currentLinks()).toEqual([label]);
      expect(within(screen.getByRole('banner')).getByText(label)).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    },
  );

  it('groups the eight sections under Catalog, Sales, and Store', () => {
    renderApp('/books');

    const nav = sidebarNav();
    expect(
      within(nav)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(NAV_GROUPS.map((group) => group.label));
    expect(within(nav).getAllByRole('link')).toHaveLength(8);
  });

  it('links to the store in a new tab', () => {
    renderApp('/books');

    const link = screen.getByRole('link', { name: /View store/ });
    expect(link).toHaveAttribute('href', STORE_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});

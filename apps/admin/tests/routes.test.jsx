import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '../src/app/nav.js';
import { renderApp } from './utils/renderWithProviders.jsx';

describe('admin routes', () => {
  it('redirects / to the books section', async () => {
    const { router } = renderApp('/');

    await waitFor(() => expect(router.state.location.pathname).toBe('/books'));
    expect(screen.getByRole('heading', { level: 1, name: 'Books' })).toBeInTheDocument();
  });

  it('opens a section from a deep link', () => {
    renderApp('/orders');

    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });

  it.each(NAV_ITEMS.map((item) => [item.label, item.path, item.milestone]))(
    'the %s placeholder names the milestone that builds it',
    (label, path, milestone) => {
      renderApp(`/${path}`);

      expect(screen.getByRole('heading', { level: 2, name: 'Coming soon' })).toBeInTheDocument();
      expect(
        screen.getByText(`This section is a placeholder. It is built in ${milestone}.`),
      ).toBeInTheDocument();
    },
  );

  it('shows the 404 page inside the admin layout and links back to books', async () => {
    const { user, router } = renderApp('/does-not-exist');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Admin navigation' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go to books' }));

    expect(router.state.location.pathname).toBe('/books');
  });
});

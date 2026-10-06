// The mobile drawer behaviour that does not depend on CSS (visibility is checked in the browser).

import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './utils/renderWithProviders.jsx';

const menuButton = () => screen.getByRole('button', { name: 'Open navigation' });
const sidebarLink = (name) =>
  within(screen.getByRole('navigation', { name: 'Admin navigation' })).getByRole('link', { name });

describe('admin layout drawer', () => {
  it('opens from the menu button and moves focus to the first section', async () => {
    const { user } = renderApp('/books');

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-controls', 'admin-sidebar');

    await user.click(menuButton());

    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(sidebarLink('Books')).toHaveFocus());
  });

  it('closes on Escape and returns focus to the menu button', async () => {
    const { user } = renderApp('/books');
    await user.click(menuButton());
    await waitFor(() => expect(sidebarLink('Books')).toHaveFocus());

    await user.keyboard('{Escape}');

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
  });

  it('closes after a section is picked', async () => {
    const { user, router } = renderApp('/books');
    await user.click(menuButton());

    await user.click(sidebarLink('Reviews'));

    expect(router.state.location.pathname).toBe('/reviews');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when the overlay is clicked', async () => {
    const { user, container } = renderApp('/books');
    await user.click(menuButton());

    await user.click(container.querySelector('.drawer-overlay'));

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers a skip link to the main content', () => {
    renderApp('/books');

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

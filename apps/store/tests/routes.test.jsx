import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './utils/renderWithProviders.jsx';

describe('store routes and layout', () => {
  it('renders the layout around the home page', async () => {
    renderApp('/');

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Page & Pine home' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Payments secured by Razorpay');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Books worth keeping, delivered as PDFs.' }),
    ).toBeInTheDocument();
    // Let the health request settle so it does not outlive the test.
    expect(await screen.findByText('API is up')).toBeInTheDocument();
  });

  it('shows the 404 page inside the layout for an unknown route', () => {
    renderApp('/does-not-exist');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('goes back home from the 404 page', async () => {
    const { user, router } = renderApp('/missing/page');

    await user.click(screen.getByRole('link', { name: 'Back to home' }));

    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByText('API is up')).toBeInTheDocument();
  });
});

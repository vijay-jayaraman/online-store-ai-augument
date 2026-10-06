import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { API_URL } from '../src/lib/config.js';
import { apiUrl } from './mocks/handlers.js';
import { server } from './mocks/server.js';
import { renderApp } from './utils/renderWithProviders.jsx';

const respondToHealth = (body, status) =>
  server.use(http.get(apiUrl('/health'), () => HttpResponse.json(body, { status })));

describe('Home page API status', () => {
  it('shows "API is up" when the API is healthy', async () => {
    renderApp('/');

    expect(screen.getByText('Checking API status…')).toBeInTheDocument();
    expect(await screen.findByText('API is up')).toBeInTheDocument();
    expect(screen.getByText('Database up')).toBeInTheDocument();
    expect(screen.getByText('Redis up')).toBeInTheDocument();
    expect(screen.queryByText('Checking API status…')).not.toBeInTheDocument();
  });

  it('shows an error state when the API returns 503', async () => {
    respondToHealth({ status: 'error', db: 'up', redis: 'down' }, 503);

    renderApp('/');

    expect(await screen.findByText('API is unavailable')).toBeInTheDocument();
    expect(screen.getByText('Some services are down.')).toBeInTheDocument();
    expect(screen.getByText('Database up')).toBeInTheDocument();
    expect(screen.getByText('Redis down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.queryByText('API is up')).not.toBeInTheDocument();
  });

  it('says the API could not be reached on a network error', async () => {
    server.use(http.get(apiUrl('/health'), () => HttpResponse.error()));

    renderApp('/');

    expect(await screen.findByText('API is unavailable')).toBeInTheDocument();
    expect(screen.getByText(`Could not reach the API at ${API_URL}.`)).toBeInTheDocument();
    expect(screen.queryByText(/Database/)).not.toBeInTheDocument();
  });

  it('reports an unexpected status code', async () => {
    respondToHealth({ error: { code: 'INTERNAL_ERROR' } }, 500);

    renderApp('/');

    expect(await screen.findByText('The API returned an unexpected 500.')).toBeInTheDocument();
  });

  it('checks again when "Try again" is clicked', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/health'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ status: 'error', db: 'down', redis: 'up' }, { status: 503 })
          : HttpResponse.json({ status: 'ok', db: 'up', redis: 'up' });
      }),
    );
    const { user } = renderApp('/');

    expect(await screen.findByText('Database down')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('API is up')).toBeInTheDocument();
    expect(calls).toBe(2);
  });
});

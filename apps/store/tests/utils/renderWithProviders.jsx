// Renders components the way the app does: inside the Redux store and a (memory) router.

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../../src/app/routes.jsx';
import { makeStore } from '../../src/app/store.js';

function renderRouter(routeConfig, { route = '/', preloadedState, store } = {}) {
  const appStore = store ?? makeStore(preloadedState);
  const router = createMemoryRouter(routeConfig, { initialEntries: [route] });
  const user = userEvent.setup();
  const result = render(
    <Provider store={appStore}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { store: appStore, router, user, ...result };
}

// One component (or page) at `route`. Links and hooks like useNavigate work.
export function renderWithProviders(ui, options) {
  return renderRouter([{ path: '*', element: ui }], options);
}

// The whole app (layout + real routes) at `route`.
export function renderApp(route = '/', options = {}) {
  return renderRouter(routes, { ...options, route });
}

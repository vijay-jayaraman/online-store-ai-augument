import { Navigate } from 'react-router';
import AdminLayout from '../components/AdminLayout.jsx';
import ErrorPage from '../pages/ErrorPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import PlaceholderPage from '../pages/PlaceholderPage.jsx';
import { DEFAULT_PATH, NAV_ITEMS } from './nav.js';

// Exported on their own so tests can build a memory router from the same routes.
// `handle.title` is shown in the top bar.
export const routes = [
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      // No dashboard (analytics are out of scope), so the admin opens on the first section.
      { index: true, element: <Navigate to={DEFAULT_PATH} replace /> },
      ...NAV_ITEMS.map((item) => ({
        path: item.path,
        element: <PlaceholderPage section={item} />,
        handle: { title: item.label },
      })),
      { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
    ],
  },
];

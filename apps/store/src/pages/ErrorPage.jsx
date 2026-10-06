import { useRouteError } from 'react-router';
import { STORE_NAME } from '../lib/config.js';

// Route error boundary. Rendered without the layout, so it must not depend on it.
export default function ErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);

  return (
    <main className="grid min-h-dvh place-items-center bg-base-100 px-4 text-base-content">
      <title>{`Something went wrong · ${STORE_NAME}`}</title>
      <div className="max-w-md text-center">
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-3 text-base-content/80">An unexpected error occurred. Please try again.</p>
        {/* A full page load resets any broken in-memory state. */}
        <a href="/" className="btn btn-primary mt-8">
          Back to home
        </a>
      </div>
    </main>
  );
}

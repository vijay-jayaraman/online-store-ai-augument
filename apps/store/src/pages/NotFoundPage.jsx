import { Link } from 'react-router';
import { STORE_NAME } from '../lib/config.js';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
      <title>{`Page not found · ${STORE_NAME}`}</title>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-base-content/70">404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-base-content/80">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="btn btn-primary mt-8">
        Back to home
      </Link>
    </div>
  );
}

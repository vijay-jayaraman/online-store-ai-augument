import { Link } from 'react-router';
import { DEFAULT_PATH } from '../app/nav.js';
import NavIcon from '../components/icons.jsx';
import { pageTitle } from '../lib/config.js';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
      <title>{pageTitle('Page not found')}</title>
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-base-200 text-primary">
        <NavIcon name="compass" className="size-6" />
      </span>
      <h1 className="mt-4 text-3xl">Page not found</h1>
      <p className="mx-auto mt-2 max-w-md text-base-content/80">
        This admin page does not exist. Pick a section from the menu.
      </p>
      <Link to={DEFAULT_PATH} className="btn btn-primary mt-8">
        Go to books
      </Link>
    </div>
  );
}

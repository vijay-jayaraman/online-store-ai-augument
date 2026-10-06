import { Link } from 'react-router';
import { STORE_NAME } from '../lib/config.js';
import { BookOpenIcon } from './icons.jsx';

export default function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-field"
      aria-label={`${STORE_NAME} home`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary text-primary-content">
        <BookOpenIcon />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-lg font-semibold">{STORE_NAME}</span>
        <span className="text-xs text-base-content/70">Digital bookstore</span>
      </span>
    </Link>
  );
}

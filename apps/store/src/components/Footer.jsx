import { STORE_NAME } from '../lib/config.js';
import Brand from './Brand.jsx';
import { LockIcon } from './icons.jsx';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-base-300 bg-base-200">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Brand />
        <p className="mt-3 max-w-md text-sm text-base-content/75">
          PDF e-books you can buy in minutes, read anywhere and download any time from your personal
          library.
        </p>
      </div>
      <div className="border-t border-base-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-base-content/75 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {STORE_NAME}. All rights reserved.
          </span>
          <span className="flex items-center gap-1.5">
            <LockIcon className="size-4" />
            Payments secured by Razorpay
          </span>
        </div>
      </div>
    </footer>
  );
}

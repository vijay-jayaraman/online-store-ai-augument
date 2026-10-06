import ApiStatus from '../components/ApiStatus.jsx';
import { STORE_NAME } from '../lib/config.js';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <title>{STORE_NAME}</title>
      <section className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-base-content/70">
          Digital bookstore
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Books worth keeping, delivered as PDFs.</h1>
        <p className="mt-4 text-base text-base-content/80 sm:text-lg">
          Buy in minutes, read on any device, and download again any time from your library. The
          catalog is on its way.
        </p>
      </section>
      <div className="mt-10 max-w-md">
        <ApiStatus />
      </div>
    </div>
  );
}

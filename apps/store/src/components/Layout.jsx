import { Outlet, ScrollRestoration } from 'react-router';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-100 text-base-content">
      <a
        href="#main"
        className="btn btn-primary btn-sm absolute left-4 top-2 z-50 -translate-y-20 focus:translate-y-0"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const SIDEBAR_ID = 'admin-sidebar';
const DRAWER_ID = 'admin-drawer';

// Sidebar is always visible from `lg`; below that it is a drawer opened from the top bar.
export default function AdminLayout() {
  const { pathname } = useLocation();
  const matches = useMatches();
  const title = matches.findLast((match) => match.handle?.title)?.handle.title ?? '';

  // The drawer belongs to the page it was opened on, so any navigation closes it.
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);

  const menuRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    // daisyUI makes the drawer visible after a short transition delay, and a hidden element
    // cannot take focus, so retry each frame until the first link accepts it.
    let frame;
    let attempts = 0;
    const focusFirstLink = () => {
      const link = sidebarRef.current?.querySelector('nav a');
      link?.focus();
      if (link && document.activeElement !== link && attempts++ < 30) {
        frame = requestAnimationFrame(focusFirstLink);
      }
    };
    frame = requestAnimationFrame(focusFirstLink);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenOn(null);
        menuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="btn btn-primary btn-sm fixed left-4 top-2 z-50 -translate-y-20 focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="drawer lg:drawer-open">
        <input
          id={DRAWER_ID}
          type="checkbox"
          className="drawer-toggle"
          checked={open}
          onChange={(event) => setOpenOn(event.target.checked ? pathname : null)}
          tabIndex={-1}
          aria-hidden="true"
        />
        {/* The sidebar comes before the content in the DOM so keyboard users reach the
            navigation first; daisyUI places both with explicit grid columns. */}
        <div className="drawer-side z-40" ref={sidebarRef}>
          <label htmlFor={DRAWER_ID} className="drawer-overlay" aria-label="Close navigation" />
          <Sidebar id={SIDEBAR_ID} onNavigate={close} />
        </div>
        <div className="drawer-content flex min-h-dvh min-w-0 flex-col bg-base-100 text-base-content">
          <Topbar
            ref={menuRef}
            title={title}
            menuOpen={open}
            onMenuClick={() => setOpenOn(pathname)}
            sidebarId={SIDEBAR_ID}
          />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            <Outlet />
          </main>
        </div>
      </div>
      <ScrollRestoration />
    </>
  );
}

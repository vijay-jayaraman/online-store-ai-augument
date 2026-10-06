import { Link, NavLink } from 'react-router';
import { DEFAULT_PATH, NAV_GROUPS } from '../app/nav.js';
import { STORE_NAME, STORE_URL } from '../lib/config.js';
import NavIcon from './icons.jsx';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-selector px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-(--sidebar-active-bg) text-white shadow-[inset_3px_0_0_var(--sidebar-accent)]'
      : 'text-(--sidebar-fg) hover:bg-white/6 hover:text-white'
  }`;

// `onNavigate` closes the mobile drawer after a link is followed.
export default function Sidebar({ id, onNavigate }) {
  return (
    <aside
      id={id}
      className="flex min-h-full w-64 flex-col bg-(--sidebar-bg) text-(--sidebar-fg) lg:border-r lg:border-(--sidebar-border)"
    >
      <Link
        to={DEFAULT_PATH}
        onClick={onNavigate}
        className="flex items-center gap-3 border-b border-(--sidebar-border) px-5 py-5 text-(--sidebar-strong)"
      >
        <NavIcon name="book-open" className="size-7 text-(--sidebar-accent)" />
        <span className="flex flex-col">
          <span className="font-serif text-lg font-semibold uppercase tracking-wider leading-tight">
            {STORE_NAME}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.3em] text-(--sidebar-muted)">
            Seller admin
          </span>
        </span>
      </Link>

      <nav aria-label="Admin navigation" className="flex-1 px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-3 first:mt-0">
            <h2 className="px-3 pb-1.5 pt-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-(--sidebar-muted)">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink to={`/${item.path}`} className={linkClass} onClick={onNavigate}>
                    <NavIcon name={item.icon} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-(--sidebar-border) px-5 py-4 text-sm">
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-(--sidebar-fg) underline-offset-4 hover:text-white hover:underline"
        >
          View store
          <NavIcon name="external" className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </aside>
  );
}

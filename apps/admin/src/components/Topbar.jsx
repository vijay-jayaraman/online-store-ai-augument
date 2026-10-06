import NavIcon from './icons.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// `ref` points at the menu button, so focus can return to it when the drawer closes.
export default function Topbar({ ref, title, menuOpen, onMenuClick, sidebarId }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-base-300 bg-base-100/95 px-4 backdrop-blur sm:px-6">
      <button
        ref={ref}
        type="button"
        className="btn btn-ghost btn-circle lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls={sidebarId}
      >
        <NavIcon name="menu" />
      </button>
      <p className="min-w-0 flex-1 truncate font-serif text-lg font-semibold">{title}</p>
      <ThemeToggle />
    </header>
  );
}

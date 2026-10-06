import { NavLink } from 'react-router';
import Brand from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const navLinkClass = ({ isActive }) =>
  `btn btn-ghost btn-sm font-medium ${isActive ? 'text-primary underline underline-offset-8 decoration-2' : ''}`;

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Brand />
        <nav aria-label="Main" className="ml-auto">
          <ul className="flex items-center gap-1">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

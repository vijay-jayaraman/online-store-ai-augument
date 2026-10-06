import { useDispatch, useSelector } from 'react-redux';
import { selectTheme, themeToggled } from '../features/ui/uiSlice.js';
import { MoonIcon, SunIcon } from './icons.jsx';

export default function ThemeToggle() {
  const dispatch = useDispatch();
  const isDark = useSelector(selectTheme) === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle"
      onClick={() => dispatch(themeToggled())}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

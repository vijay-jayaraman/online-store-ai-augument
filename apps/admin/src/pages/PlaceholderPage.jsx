import { pageTitle } from '../lib/config.js';
import NavIcon from '../components/icons.jsx';

// Stand-in for an admin section until its milestone builds the real screen.
export default function PlaceholderPage({ section }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <title>{pageTitle(section.label)}</title>
      <h1 className="text-3xl">{section.label}</h1>
      <p className="mt-2 max-w-2xl text-base-content/80">{section.description}</p>

      <div className="card mt-8 border border-dashed border-base-300 bg-base-200">
        <div className="card-body items-center py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-base-100 text-primary">
            <NavIcon name={section.icon} className="size-6" />
          </span>
          <h2 className="mt-2 text-lg">Coming soon</h2>
          <p className="max-w-md text-sm text-base-content/80">
            This section is a placeholder. It is built in {section.milestone}.
          </p>
        </div>
      </div>
    </div>
  );
}

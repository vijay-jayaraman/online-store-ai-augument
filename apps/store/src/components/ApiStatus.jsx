import { useGetHealthQuery } from '../api/healthApi.js';
import { API_URL } from '../lib/config.js';
import { AlertIcon, CheckCircleIcon } from './icons.jsx';

const SERVICES = [
  ['db', 'Database'],
  ['redis', 'Redis'],
];

function ServiceList({ health }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {SERVICES.map(([key, label]) => {
        const up = health[key] === 'up';
        return (
          <li key={key} className={`badge ${up ? 'badge-success' : 'badge-error'}`}>
            {label} {up ? 'up' : 'down'}
          </li>
        );
      })}
    </ul>
  );
}

function errorMessage(error) {
  if (error?.status === 'FETCH_ERROR') return `Could not reach the API at ${API_URL}.`;
  if (error?.status === 503) return 'Some services are down.';
  if (typeof error?.status === 'number') return `The API returned an unexpected ${error.status}.`;
  return 'Something went wrong while checking the API.';
}

export default function ApiStatus() {
  const { data, error, isLoading, isError, isFetching, refetch } = useGetHealthQuery();

  let content;
  if (isLoading) {
    content = (
      <p className="flex items-center gap-3">
        <span className="loading loading-spinner loading-sm" aria-hidden="true" />
        Checking API status…
      </p>
    );
  } else if (isError) {
    const health = error?.data?.db ? error.data : null;
    content = (
      <>
        <p className="flex items-center gap-2 font-semibold text-error">
          <AlertIcon />
          API is unavailable
        </p>
        <p className="mt-1 text-sm text-base-content/75">{errorMessage(error)}</p>
        {health && <ServiceList health={health} />}
        <button
          type="button"
          className="btn btn-outline btn-sm mt-4"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
          Try again
        </button>
      </>
    );
  } else {
    content = (
      <>
        <p className="flex items-center gap-2 font-semibold text-success">
          <CheckCircleIcon />
          API is up
        </p>
        <ServiceList health={data} />
      </>
    );
  }

  return (
    <section
      aria-labelledby="api-status-heading"
      className="card border border-base-300 bg-base-200"
    >
      <div className="card-body">
        <h2 id="api-status-heading" className="card-title text-lg">
          API status
        </h2>
        <div role="status" aria-live="polite" aria-busy={isFetching}>
          {content}
        </div>
      </div>
    </section>
  );
}

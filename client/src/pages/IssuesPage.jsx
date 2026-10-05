import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useIssues } from '../hooks/useIssues';
import { getErrorMessage } from '../utils/getErrorMessage';
import IssueCard from '../components/IssueCard';
import IssueFilters from '../components/IssueFilters';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { IssueCardSkeleton } from '../components/Skeleton';

// First visit with no filters: start from beginner-friendly issues.
// A deliberate "clear filters" navigates with state.explicit so we don't redirect again.
export default function IssuesPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  if (searchParams.size === 0 && !location.state?.explicit) {
    return <Navigate to="/issues?difficulty=beginner" replace />;
  }
  return <IssuesView />;
}

function IssuesView() {
  // Filters live in the URL, so searches are shareable and the back button works.
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useIssues(params);

  const nav = { state: { explicit: true } };
  const search = (next) => setSearchParams(next, nav);
  const goToPage = (page) => {
    setSearchParams({ ...params, page: String(page) }, nav);
    window.scrollTo({ top: 0 });
  };

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">Explore issues</h1>
      <div className="mt-6">
        {/* key remounts the form when the URL changes (e.g. back button) so it shows the right values */}
        <IssueFilters key={searchParams.toString()} initial={params} onSearch={search} />
      </div>

      <div className="mt-6" aria-live="polite">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <IssueCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {getErrorMessage(error)}{' '}
            <button onClick={() => refetch()} className="font-medium underline">
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            {data.stale && (
              <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                GitHub is rate-limiting us right now, so these results may be slightly out of date.
              </p>
            )}
            <p className="mb-3 text-sm text-slate-500">
              {data.pagination.totalCount.toLocaleString()} issues found
              {data.pagination.totalCount > 1000 && ' (GitHub only exposes the first 1,000 results per search)'}
            </p>

            {data.items.length === 0 ? (
              <EmptyState title="No issues on this page" description="Try removing a filter or searching for something broader." />
            ) : (
              <div className={`space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {data.items.map((issue) => (
                  <IssueCard key={issue.githubId} issue={issue} />
                ))}
              </div>
            )}

            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </section>
  );
}
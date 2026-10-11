import { Link } from 'react-router-dom';
import { useRecommended } from '../hooks/useRecommendations';
import { getErrorMessage } from '../utils/getErrorMessage';
import IssueCard from './IssueCard';
import BookmarkButton from './BookmarkButton';
import EmptyState from './EmptyState';
import { IssueCardSkeleton } from './Skeleton';

export default function RecommendedIssues({ limit = 8 }) {
  const { data, isLoading, isError, error, refetch } = useRecommended(limit);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <IssueCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {getErrorMessage(error)}{' '}
        <button onClick={() => refetch()} className="font-medium underline">Try again</button>
      </div>
    );
  }

  return (
    <div>
      {data.fallback ? (
        <p className="mb-3 rounded-md bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-300">
          These are general beginner issues. <Link to="/settings" className="font-medium underline">Add your skills</Link> to
          get issues that match what you know.
        </p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Recommended for you, based on:</span>
          {data.basedOn.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs dark:bg-slate-800">{item}</span>
          ))}
        </div>
      )}

      {(data.partial || data.stale) && (
        <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          GitHub is rate-limiting us, so this list may be incomplete or slightly out of date.
        </p>
      )}

      {data.items.length === 0 ? (
        <EmptyState title="No recommendations right now" description="Check back soon, or explore issues with the filters." />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{data.items.length} beginner-friendly issues for you</p>
          <div className="space-y-3">
            {data.items.map((issue) => (
              <IssueCard
                key={issue.githubId}
                issue={issue}
                actions={
                  <>
                    <BookmarkButton issue={issue} />
                    <span className="basis-full text-xs text-slate-500">Why: {issue.reasons.join(' · ')} (score {issue.score})</span>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
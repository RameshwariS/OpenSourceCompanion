import { Link, useParams } from 'react-router-dom';
import { useIssue } from '../hooks/useIssues';
import { getErrorMessage } from '../utils/getErrorMessage';
import { formatNumber, timeAgo } from '../utils/format';
import DifficultyBadge from '../components/DifficultyBadge';
import LabelChip from '../components/LabelChip';
import BookmarkButton from '../components/BookmarkButton';
import ContributionStatus from '../components/ContributionStatus';
import { Skeleton } from '../components/Skeleton';

export default function IssueDetailPage() {
  const { owner, repo, number } = useParams();
  const { data, isLoading, isError, error } = useIssue(owner, repo, number);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <p>{getErrorMessage(error)}</p>
        <Link to="/issues" className="mt-3 inline-block font-medium underline">
          Back to issues
        </Link>
      </div>
    );
  }

  const { issue, comments, stale } = data;

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/issues" className="text-sm text-slate-500 hover:underline">
        ← Back to issues
      </Link>

      {stale && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          GitHub is rate-limiting us, so this page may be slightly out of date.
        </p>
      )}

      <p className="mt-4 text-sm text-slate-500">
        <a href={`https://github.com/${issue.repoFullName}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {issue.repoFullName}
        </a>
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        {issue.title} <span className="font-normal text-slate-500">#{issue.number}</span>
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
        <DifficultyBadge difficulty={issue.difficulty} />
        <span className="capitalize">{issue.state}</span>
        {issue.language && <span>{issue.language}</span>}
        <span>★ {formatNumber(issue.stars)}</span>
        <span>
          by{' '}
          <a href={`https://github.com/${issue.author.login}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
            @{issue.author.login}
          </a>
        </span>
        <span>Created {timeAgo(issue.createdAt)}</span>
        <span>Updated {timeAgo(issue.updatedAt)}</span>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Difficulty is our estimate based on labels, not an official GitHub classification.
      </p>

      {issue.labels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {issue.labels.map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <a
          href={issue.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          View on GitHub ↗
        </a>
        <BookmarkButton issue={issue} />
        <ContributionStatus issue={issue} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Description</h2>
      {/* Plain text on purpose: React escapes it, so issue content can never inject HTML/JS */}
      <div className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
        {issue.body || <span className="text-slate-500">No description provided.</span>}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Comments ({issue.commentsCount})</h2>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">
                <strong>@{c.author.login}</strong> · {timeAgo(c.createdAt)}
              </p>
              <div className="mt-2 whitespace-pre-wrap break-words">{c.body}</div>
            </li>
          ))}
        </ul>
      )}
      {issue.commentsCount > comments.length && (
        <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-emerald-500 hover:underline">
          Read the full discussion on GitHub ↗
        </a>
      )}
    </article>
  );
}
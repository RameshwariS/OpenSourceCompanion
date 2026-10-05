import { Link } from 'react-router-dom';
import DifficultyBadge from './DifficultyBadge';
import LabelChip from './LabelChip';
import { formatNumber, timeAgo } from '../utils/format';

// `actions` is a slot: Phase 4 passes the Bookmark button and tracking badge in here.
export default function IssueCard({ issue, actions }) {
  const shownLabels = issue.labels.slice(0, 5);
  const hiddenCount = issue.labels.length - shownLabels.length;

  return (
    <article className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">
            {issue.owner} / <span className="font-medium text-slate-700 dark:text-slate-300">{issue.repoName}</span>
          </p>
          <h3 className="mt-1 text-base font-semibold">
            <Link
              to={`/issues/${issue.owner}/${issue.repoName}/${issue.number}`}
              className="hover:text-emerald-500 hover:underline"
            >
              {issue.title}
            </Link>{' '}
            <span className="font-normal text-slate-500">#{issue.number}</span>
          </h3>
        </div>
        <DifficultyBadge difficulty={issue.difficulty} />
      </div>

      {issue.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shownLabels.map((l) => (
            <LabelChip key={l.name} label={l} />
          ))}
          {hiddenCount > 0 && <span className="text-xs text-slate-500">+{hiddenCount} more</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {issue.language && <span>{issue.language}</span>}
        <span title="Repository stars">★ {formatNumber(issue.stars)}</span>
        <span>💬 {issue.commentsCount}</span>
        <span>Created {timeAgo(issue.createdAt)}</span>
        <span>Updated {timeAgo(issue.updatedAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={issue.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          View on GitHub ↗
        </a>
        {actions}
      </div>
    </article>
  );
}
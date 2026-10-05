import { useState } from 'react';
import { usePullRequests, useRefreshPullRequests } from '../hooks/usePullRequests';
import { getErrorMessage } from '../utils/getErrorMessage';
import { timeAgo } from '../utils/format';
import EmptyState from '../components/EmptyState';
import GitHubButton from '../components/GitHubButton';
import { PullRequestState, ReviewStatus } from '../components/PullRequestState';
import { Skeleton } from '../components/Skeleton';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
];

export default function PullRequestsPage() {
  const { data, isLoading, isError, error } = usePullRequests();
  const refresh = useRefreshPullRequests();
  const [tab, setTab] = useState('all');

  if (isError && error.response?.data?.code === 'GITHUB_NOT_CONNECTED') {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState title="Connect GitHub to track your pull requests" description="We read your public pull requests. We never ask for write access.">
          <div className="mx-auto w-48">
            <GitHubButton href="/api/auth/github/link">Connect GitHub</GitHubButton>
          </div>
        </EmptyState>
      </div>
    );
  }

  const items = data?.items.filter((p) => tab === 'all' || p.state === tab) ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Pull requests</h1>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {refresh.isPending ? 'Refreshing…' : 'Refresh from GitHub'}
        </button>
      </div>

      {isLoading && <Skeleton className="mt-6 h-40 w-full" />}

      {isError && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {getErrorMessage(error)}
        </p>
      )}

      {data && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total PRs', data.stats.total],
              ['Merged', data.stats.merged],
              ['Open', data.stats.open],
              ['Closed', data.stats.closed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <dd className="text-2xl font-bold">{value}</dd>
                <dt className="text-xs text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>

          {data.stale && (
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              GitHub is rate-limiting us, so this data may be slightly out of date.
            </p>
          )}

          <div role="tablist" aria-label="Filter pull requests" className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-2 text-sm ${tab === t.value ? 'border-b-2 border-emerald-500 font-medium' : 'text-slate-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No pull requests here" description="Pull requests you open on public repositories will appear automatically." />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((p) => (
                <li key={p.githubId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-slate-500">{p.repoFullName}</p>
                      <a href={p.htmlUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-medium hover:text-emerald-500 hover:underline">
                        {p.title} <span className="font-normal text-slate-500">#{p.number}</span>
                      </a>
                    </div>
                    <PullRequestState state={p.state} draft={p.draft} />
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Opened {timeAgo(p.createdAt)}</span>
                    <span>Updated {timeAgo(p.updatedAt)}</span>
                    {p.mergedAt && <span>Merged {timeAgo(p.mergedAt)}</span>}
                    <ReviewStatus status={p.reviewStatus} />
                  </p>
                </li>
              ))}
            </ul>
          )}

          {data.truncated && (
            <p className="mt-4 text-xs text-slate-500">
              Showing your {data.items.length} most recently updated pull requests. The totals above include all of them.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Data is cached for up to 15 minutes. Review status is shown for up to 10 open pull requests.</p>
        </>
      )}
    </section>
  );
}
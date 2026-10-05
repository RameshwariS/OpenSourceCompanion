import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUSES } from '../constants/contribution';
import { useContributionStats, useContributions, useUpdateContribution } from '../hooks/useContributions';
import { getErrorMessage } from '../utils/getErrorMessage';
import ContributionCard from '../components/ContributionCard';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

export default function MyContributionsPage() {
  const { data: contributions, isLoading, isError, error } = useContributions();
  const { data: stats } = useContributionStats();
  const update = useUpdateContribution();
  const [dragOver, setDragOver] = useState(null);

  const drop = (e, status) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const item = contributions.find((c) => c.id === id);
    if (item && item.status !== status) update.mutate({ id, status });
  };

  return (
    <section>
      <h1 className="text-2xl font-bold tracking-tight">My contributions</h1>

      {stats && (
        <p className="mt-2 text-sm text-slate-500">
          {stats.total} tracked · {stats.byStatus.merged} merged · {stats.repositories} repositories
        </p>
      )}

      {isLoading && (
        <div className="mt-6 flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-64 shrink-0" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {getErrorMessage(error)}
        </p>
      )}

      {contributions?.length === 0 && (
        <div className="mt-6">
          <EmptyState title="You are not tracking any issues yet" description="Open an issue and press “Track issue” to start your board.">
            <Link to="/issues" className="text-emerald-500 hover:underline">
              Explore issues
            </Link>
          </EmptyState>
        </div>
      )}

      {contributions?.length > 0 && (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((column) => {
            const items = contributions.filter((c) => c.status === column.value);
            return (
              <section
                key={column.value}
                aria-label={`${column.label} column`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(column.value);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => drop(e, column.value)}
                className={`w-72 shrink-0 rounded-lg border p-3 ${
                  dragOver === column.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                }`}
              >
                <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {column.label}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-800">{items.length}</span>
                </h2>
                <div className="space-y-3">
                  {items.map((c) => (
                    <ContributionCard key={c.id} contribution={c} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
import { STATUSES } from '../constants/contribution';
import { useRemoveContribution, useTrackIssue, useUpdateContribution } from '../hooks/useContributions';

// `issue` needs: repoFullName, number, contribution ({ id, status } or null)
export default function ContributionStatus({ issue }) {
  const track = useTrackIssue();
  const update = useUpdateContribution();
  const remove = useRemoveContribution();
  const contribution = issue.contribution;

  if (!contribution) {
    return (
      <button
        type="button"
        disabled={track.isPending}
        onClick={() => track.mutate({ repo: issue.repoFullName, number: issue.number })}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        Track issue
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`status-${contribution.id}`} className="sr-only">
        Contribution status
      </label>
      <select
        id={`status-${contribution.id}`}
        value={contribution.status}
        onChange={(e) => update.mutate({ id: contribution.id, status: e.target.value })}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={remove.isPending}
        onClick={() => remove.mutate(contribution.id)}
        className="text-xs text-slate-500 hover:underline disabled:opacity-60"
      >
        Stop tracking
      </button>
    </div>
  );
}
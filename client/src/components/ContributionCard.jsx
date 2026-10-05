import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUSES } from '../constants/contribution';
import { useRemoveContribution, useUpdateContribution } from '../hooks/useContributions';
import DifficultyBadge from './DifficultyBadge';
import { timeAgo } from '../utils/format';

export default function ContributionCard({ contribution }) {
  const { issue } = contribution;
  const update = useUpdateContribution();
  const remove = useRemoveContribution();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(contribution.notes);

  const saveNotes = () => {
    update.mutate({ id: contribution.id, notes });
    setEditing(false);
  };

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', contribution.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="truncate text-xs text-slate-500">{issue.repoFullName}</p>
      <Link
        to={`/issues/${issue.owner}/${issue.repoName}/${issue.number}`}
        className="mt-0.5 block font-medium hover:text-emerald-500 hover:underline"
      >
        {issue.title} <span className="font-normal text-slate-500">#{issue.number}</span>
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={issue.difficulty} />
        {issue.state === 'closed' && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">Closed on GitHub</span>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <label htmlFor={`notes-${contribution.id}`} className="sr-only">
            Notes
          </label>
          <textarea
            id={`notes-${contribution.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="mt-1 flex gap-3 text-xs">
            <button onClick={saveNotes} className="font-medium text-emerald-600">
              Save
            </button>
            <button
              onClick={() => {
                setNotes(contribution.notes);
                setEditing(false);
              }}
              className="text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        contribution.notes && (
          <p className="mt-3 whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            {contribution.notes}
          </p>
        )
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {/* The select works on touch devices and for keyboard users, where drag and drop can't */}
        <label htmlFor={`move-${contribution.id}`} className="sr-only">
          Move to
        </label>
        <select
          id={`move-${contribution.id}`}
          value={contribution.status}
          onChange={(e) => update.mutate({ id: contribution.id, status: e.target.value })}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-slate-500 hover:underline">
            {contribution.notes ? 'Edit notes' : 'Add notes'}
          </button>
        )}
        <button onClick={() => remove.mutate(contribution.id)} className="text-slate-500 hover:underline">
          Remove
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Updated {timeAgo(contribution.updatedAt)}</p>
    </article>
  );
}
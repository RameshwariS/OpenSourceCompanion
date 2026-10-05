const STATE_STYLES = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  merged: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const REVIEW_LABELS = {
  approved: ['Approved', 'text-emerald-600'],
  changes_requested: ['Changes requested', 'text-amber-600'],
  none: ['Awaiting review', 'text-slate-500'],
};

export function PullRequestState({ state, draft }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATE_STYLES[state]}`}>
      {draft ? 'Draft' : state}
    </span>
  );
}

export function ReviewStatus({ status }) {
  if (!status) return null;
  const [label, color] = REVIEW_LABELS[status];
  return <span className={`text-xs ${color}`}>{label}</span>;
}
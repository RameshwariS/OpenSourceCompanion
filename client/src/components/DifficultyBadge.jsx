const STYLES = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

export default function DifficultyBadge({ difficulty }) {
  return (
    <span
      title="Estimated from issue labels. Not an official GitHub rating."
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[difficulty] ?? STYLES.advanced}`}
    >
      {difficulty}
    </span>
  );
}

export default function BadgeList({ badges }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {badges.map((b) => (
        <li
          key={b.id}
          className={`flex items-start gap-3 rounded-lg border p-3 ${
            b.earned
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
              : 'border-slate-200 opacity-50 dark:border-slate-800'
          }`}
        >
          <span className={`text-2xl ${b.earned ? '' : 'grayscale'}`} aria-hidden="true">
            {b.emoji}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {b.label} <span className="sr-only">{b.earned ? '(earned)' : '(not earned yet)'}</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{b.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#94a3b8'];

// `languages` is null when GitHub couldn't be reached
export default function LanguageBar({ languages }) {
  if (languages === null) return <p className="text-sm text-slate-500">Language data is unavailable right now.</p>;
  if (languages.length === 0) return <p className="text-sm text-slate-500">No language data.</p>;

  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="img"
        aria-label={languages.map((l) => `${l.name} ${l.percent}%`).join(', ')}
      >
        {languages.map((l, i) => (
          <div key={l.name} style={{ width: `${l.percent}%`, backgroundColor: COLORS[i % COLORS.length] }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {languages.map((l, i) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
            {l.name} <span className="text-slate-500">{l.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
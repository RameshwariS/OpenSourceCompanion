import { timeAgo } from '../utils/format';

// `items` is null when GitHub couldn't be reached
export default function ActivityList({ items }) {
  if (items === null) return <p className="text-sm text-slate-500">Recent activity is unavailable right now.</p>;
  if (items.length === 0) return <p className="text-sm text-slate-500">No recent public activity.</p>;

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {items.map((a) => (
        <li key={a.id} className="p-3 text-sm">
          <p className="text-xs text-slate-500">
            <strong>@{a.actor}</strong> {a.text} · {timeAgo(a.createdAt)}
          </p>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block hover:text-emerald-500 hover:underline">
            {a.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
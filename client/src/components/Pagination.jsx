export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Show a window of up to 5 page numbers around the current page
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const base = 'rounded-md border px-3 py-1.5 text-sm disabled:opacity-40';
  const idle = 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      <button className={`${base} ${idle}`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${base} ${p === page ? 'border-emerald-600 bg-emerald-600 text-white' : idle}`}
        >
          {p}
        </button>
      ))}
      <button className={`${base} ${idle}`} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
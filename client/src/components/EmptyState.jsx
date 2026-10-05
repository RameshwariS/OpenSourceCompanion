export default function EmptyState({ title, description, children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
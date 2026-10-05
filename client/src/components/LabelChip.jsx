export default function LabelChip({ label }) {
  // GitHub gives a hex colour; only use it if it really is 6 hex digits
  const dot = /^[0-9a-f]{6}$/i.test(label.color) ? `#${label.color}` : '#94a3b8';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
      {label.name}
    </span>
  );
}
import { useHealth } from '../hooks/useHealth';

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`font-medium ${ok ? 'text-emerald-500' : 'text-red-500'}`}>{value}</span>
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading, isError } = useHealth();

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Find your first open-source contribution.</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Phase 1 is complete when the status card below is green.
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 p-4 dark:border-slate-800" aria-live="polite">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">System status</h2>
        {isLoading && <p className="py-2 text-slate-500">Checking API…</p>}
        {isError && <StatusRow label="API" value="unreachable — is the server running?" ok={false} />}
        {data && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <StatusRow label="API" value={data.status} ok={data.status === 'ok'} />
            <StatusRow label="Database" value={data.database} ok={data.database === 'connected'} />
          </div>
        )}
      </div>
    </section>
  );
}
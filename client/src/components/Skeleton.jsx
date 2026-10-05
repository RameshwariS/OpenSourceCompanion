export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export function IssueCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800" aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-4 h-4 w-1/2" />
    </div>
  );
}
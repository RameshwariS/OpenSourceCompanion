import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { getErrorMessage } from '../utils/getErrorMessage';
import { OAUTH_ERRORS } from '../utils/oauthErrors';
import ActivityHeatmap from '../components/ActivityHeatmap';
import GitHubButton from '../components/GitHubButton';
import RecommendedIssues from '../components/RecommendedIssues';
import StatusChart from '../components/StatusChart';
import { Skeleton } from '../components/Skeleton';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-2xl font-bold">{value ?? '–'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useDashboard();

  const oauthError = OAUTH_ERRORS[searchParams.get('error')];
  const justLinked = searchParams.get('github') === 'linked';

  const github = data?.github;
  const tracking = data?.tracking;

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name} 👋</h1>

      {oauthError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{oauthError}</p>
      )}
      {justLinked && (
        <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          GitHub account connected.
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Your contributions</h2>
      {isLoading && <Skeleton className="mt-3 h-24 w-full" />}
      {isError && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{getErrorMessage(error)}</p>
      )}

      {data && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Issues tracked" value={tracking.total} />
            <Stat label="PRs opened (public)" value={github.pullRequests?.total} />
            <Stat label="PRs merged" value={github.pullRequests?.merged} />
            <Stat label="Repositories tracked" value={tracking.repositories} />
          </div>

          <h2 className="mt-8 text-lg font-semibold">Contribution activity</h2>
          <div className="mt-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            {!github.connected && (
              <div className="text-sm">
                <p className="mb-3 text-slate-600 dark:text-slate-400">Connect GitHub to see your pull requests and activity here.</p>
                <div className="w-48">
                  <GitHubButton href="/api/auth/github/link">Connect GitHub</GitHubButton>
                </div>
              </div>
            )}
            {github.connected && !github.available && (
              <p className="text-sm text-amber-700 dark:text-amber-300">GitHub data is temporarily unavailable (rate limit). Please try again in a minute.</p>
            )}
            {github.available && !github.activity && <p className="text-sm text-slate-500">Activity is unavailable right now.</p>}
            {github.available && github.activity && (
              <>
                <ActivityHeatmap days={github.activity.days} total={github.activity.total} />
                <p className="mt-3 text-xs text-slate-500">
                  {github.activity.total} activities in the last 13 weeks on other people's repositories (PRs, reviews, issues, comments).
                  GitHub only exposes your last 90 days or 300 events.
                </p>
              </>
            )}
          </div>

          {tracking.total > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold">Tracked issues by status</h2>
              <div className="mt-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <StatusChart byStatus={tracking.byStatus} />
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Recommended issues</h2>
        <Link to="/recommended" className="text-sm text-emerald-500 hover:underline">See more →</Link>
      </div>
      <div className="mt-3">
        <RecommendedIssues limit={8} />
      </div>
    </section>
  );
}
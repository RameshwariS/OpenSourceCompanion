import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GitHubButton from '../components/GitHubButton';
import { OAUTH_ERRORS } from '../utils/oauthErrors';

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const error = OAUTH_ERRORS[searchParams.get('error')];
  const justLinked = searchParams.get('github') === 'linked';

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name} 👋</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {justLinked && (
        <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          GitHub account connected.
        </p>
      )}

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        <Row label="Username" value={`@${user.username}`} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} />
        <div className="flex items-center justify-between gap-4 p-4">
          <span className="text-slate-600 dark:text-slate-400">GitHub</span>
          {user.github?.username ? (
            <span className="flex items-center gap-2 font-medium">
              {user.github.avatarUrl && <img src={user.github.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}@
              {user.github.username}
            </span>
          ) : (
            <div className="w-48">
              <GitHubButton href="/api/auth/github/link">Connect GitHub</GitHubButton>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        The real dashboard (recommended issues, stats, activity chart) arrives in later phases.
      </p>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
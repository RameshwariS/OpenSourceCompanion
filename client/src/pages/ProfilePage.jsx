import { Link, useParams } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { getErrorMessage } from '../utils/getErrorMessage';
import { timeAgo } from '../utils/format';
import UserAvatar from '../components/UserAvatar';
import BadgeList from '../components/BadgeList';
import GitHubButton from '../components/GitHubButton';
import { PullRequestState } from '../components/PullRequestState';
import { Skeleton } from '../components/Skeleton';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-2xl font-bold">{value ?? '–'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

const extLink = { target: '_blank', rel: 'noopener noreferrer' };

export default function ProfilePage() {
  const { username } = useParams();
  const { data, isLoading, isError, error } = useProfile(username);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {getErrorMessage(error)}
      </div>
    );
  }

  const { profile, isSelf, issuesTracked, github } = data;
  const pr = github.pullRequests;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="flex items-start gap-4">
        <UserAvatar name={profile.name} src={profile.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-slate-500">
            @{profile.username} · <span className="capitalize">{profile.role}</span>
            {profile.location && ` · ${profile.location}`}
          </p>
          {profile.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{profile.bio}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {profile.githubUsername && (
              <a href={`https://github.com/${profile.githubUsername}`} {...extLink} className="text-emerald-500 hover:underline">
                GitHub ↗
              </a>
            )}
            {profile.portfolioUrl && (
              <a href={profile.portfolioUrl} {...extLink} className="text-emerald-500 hover:underline">
                Portfolio ↗
              </a>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} {...extLink} className="text-emerald-500 hover:underline">
                LinkedIn ↗
              </a>
            )}
          </p>
        </div>
        {isSelf && (
          <Link to="/settings" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            Edit profile
          </Link>
        )}
      </header>

      {profile.skills.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Skills">
          {profile.skills.map((s) => (
            <li key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
              {s}
            </li>
          ))}
        </ul>
      )}

      {!github.connected && (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm dark:border-slate-700">
          {isSelf ? (
            <>
              <p className="mb-3 text-slate-600 dark:text-slate-400">Connect GitHub to show your pull requests, streak, and badges.</p>
              <div className="mx-auto w-48">
                <GitHubButton href="/api/auth/github/link">Connect GitHub</GitHubButton>
              </div>
            </>
          ) : (
            <p className="text-slate-500">This contributor hasn't connected GitHub yet.</p>
          )}
        </div>
      )}

      {github.connected && !github.available && (
        <p className="mt-8 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          GitHub data is temporarily unavailable (rate limit). Please try again in a minute.
        </p>
      )}

      {github.available && (
        <>
          {github.stale && (
            <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              GitHub is rate-limiting us, so these numbers may be slightly out of date.
            </p>
          )}

          <h2 className="mt-8 text-lg font-semibold">Contributions</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pull requests" value={pr.total} />
            <Stat label="Merged" value={pr.merged} />
            <Stat label="Repositories contributed to" value={github.repositories.length} />
            <Stat label="Issues tracked" value={issuesTracked} />
            <Stat label="Current streak (days)" value={github.streak?.current} />
            <Stat label="Longest streak (days)" value={github.streak?.longest} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Repositories, badges and streaks only count activity on <strong>other people's</strong> repositories. Streaks are
            based on GitHub's public activity from the last 90 days.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Badges</h2>
          <div className="mt-3">
            <BadgeList badges={github.badges} />
          </div>

          {github.recentMerged.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold">Recently merged</h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {github.recentMerged.map((p) => (
                  <li key={p.githubId} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <a href={p.htmlUrl} {...extLink} className="block truncate font-medium hover:text-emerald-500 hover:underline">
                        {p.title}
                      </a>
                      <p className="text-xs text-slate-500">
                        {p.repoFullName} #{p.number} · merged {timeAgo(p.mergedAt)}
                      </p>
                    </div>
                    <PullRequestState state="merged" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </article>
  );
}
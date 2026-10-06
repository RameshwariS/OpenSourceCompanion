import { Link, useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { getErrorMessage } from '../utils/getErrorMessage';
import { formatNumber, timeAgo } from '../utils/format';
import FollowButton from '../components/FollowButton';
import VerifiedBadge from '../components/VerifiedBadge';
import LanguageBar from '../components/LanguageBar';
import ActivityList from '../components/ActivityList';
import ProjectManager from '../components/ProjectManager';
import IssueCard from '../components/IssueCard';
import BookmarkButton from '../components/BookmarkButton';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

const extLink = { target: '_blank', rel: 'noopener noreferrer' };

function Fact({ label, children }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <dd className="text-lg font-semibold">{children}</dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}

// `issues` is null when GitHub couldn't be reached
function IssueSection({ title, issues, seeAllTo, emptyText }) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link to={seeAllTo} className="text-sm text-emerald-500 hover:underline">See all →</Link>
      </div>
      {issues === null && <p className="mt-2 text-sm text-slate-500">Issues are unavailable right now. Please try again in a minute.</p>}
      {issues?.length === 0 && <p className="mt-2 text-sm text-slate-500">{emptyText}</p>}
      {issues?.length > 0 && (
        <div className="mt-3 space-y-3">
          {issues.map((issue) => (
            <IssueCard key={issue.githubId} issue={issue} actions={<BookmarkButton issue={issue} />} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <p>{getErrorMessage(error)}</p>
        <Link to="/projects" className="mt-3 inline-block font-medium underline">Back to projects</Link>
      </div>
    );
  }

  const { project, languages, beginnerIssues, helpWantedIssues, recentActivity, canManage, stale } = data;
  const repoParam = encodeURIComponent(project.repoFullName);

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/projects" className="text-sm text-slate-500 hover:underline">← Back to projects</Link>

      {stale && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          GitHub is rate-limiting us or unreachable, so some of this page may be slightly out of date.
        </p>
      )}

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {project.avatarUrl && <img src={project.avatarUrl} alt="" className="h-14 w-14 rounded-lg" />}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{project.repoFullName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
              <VerifiedBadge verified={project.verified} />
              {project.archived && <span className="text-amber-600">Archived</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {project.followersCount} {project.followersCount === 1 ? 'follower' : 'followers'}
          </span>
          <FollowButton project={project} />
          <a href={`https://github.com/${project.repoFullName}`} {...extLink} className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            View on GitHub ↗
          </a>
        </div>
      </header>

      {project.description && <p className="mt-4 text-slate-700 dark:text-slate-300">{project.description}</p>}

      {project.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
          {project.topics.map((t) => (
            <li key={t}>
              <Link to={`/projects?topic=${encodeURIComponent(t)}`} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                {t}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(project.summary || project.contributingUrl) && (
        <section className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <h2 className="text-sm font-semibold">From the maintainers</h2>
          {/* Plain text on purpose: React escapes it */}
          {project.summary && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{project.summary}</p>}
          {project.contributingUrl && (
            <a href={project.contributingUrl} {...extLink} className="mt-2 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
              Contributing guide ↗
            </a>
          )}
        </section>
      )}

      <h2 className="mt-8 text-lg font-semibold">Project information</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Stars">★ {formatNumber(project.stars)}</Fact>
        <Fact label="Forks">{formatNumber(project.forks)}</Fact>
        <Fact label="Contributors">{formatNumber(project.contributorsCount)}</Fact>
        <Fact label="License">{project.license ?? '–'}</Fact>
      </dl>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium">Languages</h3>
        <LanguageBar languages={languages} />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {project.listedBy && (
          <>
            Listed by <Link to={`/users/${project.listedBy.username}`} className="hover:underline">@{project.listedBy.username}</Link> ·{' '}
          </>
        )}
        Data synced {timeAgo(project.lastSyncedAt)}
      </p>

      <IssueSection
        title={`Beginner issues (${project.beginnerIssueCount})`}
        issues={beginnerIssues}
        seeAllTo={`/issues?repo=${repoParam}&difficulty=beginner`}
        emptyText="No open beginner-labelled issues right now."
      />
      <IssueSection
        title={`Help wanted (${project.helpWantedIssueCount})`}
        issues={helpWantedIssues}
        seeAllTo={`/issues?repo=${repoParam}&helpWanted=true`}
        emptyText="No open help-wanted issues right now."
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="mt-3">
          <ActivityList items={recentActivity} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Discussions</h2>
        <div className="mt-3">
          <EmptyState title="Discussions are coming soon" description="Project discussions arrive in a later phase of OpenSourceCompanion." />
        </div>
      </section>

      {canManage && <ProjectManager project={project} />}
    </article>
  );
}
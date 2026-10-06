import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';
import VerifiedBadge from './VerifiedBadge';
import { formatNumber } from '../utils/format';

export default function ProjectCard({ project }) {
  const shownTopics = project.topics.slice(0, 4);

  return (
    <article className="flex flex-col rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        {project.avatarUrl && <img src={project.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-md" />}
        <div className="min-w-0">
          <h3 className="truncate font-semibold">
            <Link to={`/projects/${project.id}`} className="hover:text-emerald-500 hover:underline">
              {project.repoFullName}
            </Link>
          </h3>
          <VerifiedBadge verified={project.verified} />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {project.description || 'No description provided.'}
      </p>

      {shownTopics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
          {shownTopics.map((t) => (
            <li key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
              {t}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {project.language && <dd>{project.language}</dd>}
        <dd title="Stars">★ {formatNumber(project.stars)}</dd>
        <dd title="Contributors">👥 {formatNumber(project.contributorsCount)}</dd>
        <dd title="Open beginner-friendly issues">🌱 {project.beginnerIssueCount} beginner</dd>
      </dl>

      <div className="mt-auto flex items-center justify-between pt-4">
        <FollowButton project={project} />
        <span className="text-xs text-slate-500">
          {project.followersCount} {project.followersCount === 1 ? 'follower' : 'followers'}
        </span>
      </div>
    </article>
  );
}
import { useFollowProject, useUnfollowProject } from '../hooks/useProjects';

// `project` needs: id, isFollowing
export default function FollowButton({ project }) {
  const follow = useFollowProject();
  const unfollow = useUnfollowProject();
  const pending = follow.isPending || unfollow.isPending;

  const toggle = () => (project.isFollowing ? unfollow : follow).mutate(project.id);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={project.isFollowing}
      className={`rounded-md border px-3 py-1 text-xs disabled:opacity-60 ${
        project.isFollowing
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {project.isFollowing ? '✓ Following' : '+ Follow'}
    </button>
  );
}
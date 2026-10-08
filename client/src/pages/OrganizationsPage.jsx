import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFollowOrg, useFollowedOrgs, useUnfollowOrg } from '../hooks/useOrgs';
import { getErrorMessage } from '../utils/getErrorMessage';
import { timeAgo } from '../utils/format';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

// Accept "kubernetes", "github.com/kubernetes" or a full URL
const normalize = (value) =>
  value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^github\.com\//i, '')
    .split('/')[0];

export default function OrganizationsPage() {
  const { data, isLoading, isError, error } = useFollowedOrgs();
  const follow = useFollowOrg();
  const unfollow = useUnfollowOrg();
  const [org, setOrg] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      await follow.mutateAsync(normalize(org));
      setOrg('');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Follow a GitHub organization and we'll notify you when a new issue is opened in any of its repositories. We check
        every 15 minutes, so a notification can arrive a little after the issue is created.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <FormField id="org" label="Organization" placeholder="e.g. kubernetes" required value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={follow.isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {follow.isPending ? 'Checking…' : 'Follow'}
        </button>
      </form>
      {formError && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {formError}
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">You follow</h2>
      {isLoading && <Skeleton className="mt-3 h-20 w-full" />}
      {isError && <p role="alert" className="mt-3 text-sm text-red-600">{getErrorMessage(error)}</p>}
      {data?.length === 0 && (
        <div className="mt-3">
          <EmptyState title="You are not following any organizations" description="Add one above to start getting notified about new issues." />
        </div>
      )}
      {data?.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {data.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                {f.avatarUrl && <img src={f.avatarUrl} alt="" loading="lazy" className="h-8 w-8 rounded" />}
                <div className="min-w-0">
                  <Link to={`/issues?org=${encodeURIComponent(f.org)}&sort=created`} className="font-medium hover:text-emerald-500 hover:underline">
                    {f.org}
                  </Link>
                  <p className="text-xs text-slate-500">Following since {timeAgo(f.followedAt)}</p>
                </div>
              </div>
              <button onClick={() => unfollow.mutate(f.org)} disabled={unfollow.isPending} className="text-xs text-slate-500 hover:underline disabled:opacity-60">
                Unfollow
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
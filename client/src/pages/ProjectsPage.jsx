import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { getErrorMessage } from '../utils/getErrorMessage';
import { LANGUAGES } from '../constants/languages';
import ProjectCard from '../components/ProjectCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

const field = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

function ProjectFilters({ initial, onSearch }) {
  const [form, setForm] = useState({
    q: initial.q ?? '',
    language: initial.language ?? '',
    topic: initial.topic ?? '',
    sort: initial.sort ?? 'stars',
  });
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const out = {};
    for (const [key, value] of Object.entries(form)) if (value.trim()) out[key] = value.trim();
    if (out.sort === 'stars') delete out.sort; // server default
    onSearch(out);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <label htmlFor="q" className="block text-sm font-medium">Search projects</label>
          <input id="q" name="q" value={form.q} onChange={update} maxLength={80} placeholder="name, description or topic" className={field} />
        </div>
        <div>
          <label htmlFor="language" className="block text-sm font-medium">Language</label>
          <select id="language" name="language" value={form.language} onChange={update} className={field}>
            <option value="">Any</option>
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="topic" className="block text-sm font-medium">Topic</label>
          <input id="topic" name="topic" value={form.topic} onChange={update} placeholder="e.g. kubernetes" className={field} />
        </div>
        <div>
          <label htmlFor="sort" className="block text-sm font-medium">Sort by</label>
          <select id="sort" name="sort" value={form.sort} onChange={update} className={field}>
            <option value="stars">Most stars</option>
            <option value="beginner">Most beginner issues</option>
            <option value="newest">Recently listed</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          Search
        </button>
        <button type="button" onClick={() => onSearch({})} className="text-sm text-slate-500 hover:underline">
          Clear filters
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useProjects(params);

  const following = params.following === 'true';
  const canAdd = ['maintainer', 'admin'].includes(user.role);
  const hasFilters = Boolean(params.q || params.language || params.topic);

  const search = (next) => setSearchParams(following ? { ...next, following: 'true' } : next);
  const showTab = (tabFollowing) => {
    const { following: _drop, page: _page, ...rest } = params; // eslint-disable-line no-unused-vars
    setSearchParams(tabFollowing ? { ...rest, following: 'true' } : rest);
  };
  const goToPage = (page) => {
    setSearchParams({ ...params, page: String(page) });
    window.scrollTo({ top: 0 });
  };

  const tabClass = (active) => `px-3 py-2 text-sm ${active ? 'border-b-2 border-emerald-500 font-medium' : 'text-slate-500'}`;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        {canAdd && (
          <Link to="/projects/new" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
            + List a project
          </Link>
        )}
      </div>

      <div className="mt-6">
        <ProjectFilters key={searchParams.toString()} initial={params} onSearch={search} />
      </div>

      <div role="tablist" aria-label="Project lists" className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button role="tab" aria-selected={!following} onClick={() => showTab(false)} className={tabClass(!following)}>
          All projects
        </button>
        <button role="tab" aria-selected={following} onClick={() => showTab(true)} className={tabClass(following)}>
          Following
        </button>
      </div>

      <div className="mt-6" aria-live="polite">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {getErrorMessage(error)}{' '}
            <button onClick={() => refetch()} className="font-medium underline">Try again</button>
          </div>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm text-slate-500">{data.pagination.totalCount} projects</p>

            {data.items.length === 0 ? (
              <EmptyState
                title={following ? 'You are not following any projects yet' : hasFilters ? 'No projects match these filters' : 'No projects have been listed yet'}
                description={following ? 'Follow a project and it shows up here.' : hasFilters ? 'Try removing a filter.' : 'Maintainers can list their repositories to get contributors.'}
              >
                {canAdd && !hasFilters && !following && (
                  <Link to="/projects/new" className="text-emerald-500 hover:underline">List the first project</Link>
                )}
              </EmptyState>
            ) : (
              <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {data.items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}

            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </section>
  );
}
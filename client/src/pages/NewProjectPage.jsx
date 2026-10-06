import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterProject } from '../hooks/useProjects';
import { getErrorMessage } from '../utils/getErrorMessage';
import FormField from '../components/FormField';

// Accept "owner/name", a full GitHub URL, or a ".git" clone URL
const normalize = (value) =>
  value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

export default function NewProjectPage() {
  const navigate = useNavigate();
  const register = useRegisterProject();
  const [repo, setRepo] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const project = await register.mutateAsync(normalize(repo));
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <Link to="/projects" className="text-sm text-slate-500 hover:underline">← Back to projects</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">List a project</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Enter a public GitHub repository. We fetch its details from GitHub, so there is nothing else to fill in.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField id="repo" label="Repository" placeholder="owner/name or a github.com URL" required value={repo} onChange={(e) => setRepo(e.target.value)} />
        <button
          type="submit"
          disabled={register.isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {register.isPending ? 'Listing…' : 'List project'}
        </button>
      </form>

      <div className="mt-8 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <p className="font-medium text-slate-800 dark:text-slate-200">About verification</p>
        <p className="mt-1">
          If you connected GitHub and you own the repository (or are a public member of its organization), your listing shows
          a <strong>Verified maintainer</strong> badge. Otherwise it appears as "Community listed". To make your organization
          membership public, see your organization's People page on GitHub.
        </p>
      </div>
    </section>
  );
}
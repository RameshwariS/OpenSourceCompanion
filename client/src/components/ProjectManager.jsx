import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteProject, useUpdateProject } from '../hooks/useProjects';
import FormField from './FormField';

// Shown only when the API says canManage. The backend enforces it again.
export default function ProjectManager({ project }) {
  const navigate = useNavigate();
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const [form, setForm] = useState({ summary: project.summary, contributingUrl: project.contributingUrl });
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function handleDelete() {
    if (!window.confirm(`Remove ${project.repoFullName} from OpenSourceCompanion? Its followers will lose it too.`)) return;
    try {
      await remove.mutateAsync(project.id);
      navigate('/projects');
    } catch {
      // the hook already showed an error toast
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 className="text-lg font-semibold">Manage project</h2>
      <p className="mt-1 text-xs text-slate-500">
        Description, stars, topics and issue counts come from GitHub. You can add a welcome note for new contributors.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ id: project.id, ...form });
        }}
        className="mt-4 space-y-4"
      >
        <div>
          <label htmlFor="summary" className="block text-sm font-medium">
            How to get started (shown to contributors)
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={4}
            maxLength={1000}
            value={form.summary}
            onChange={change}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-1 text-xs text-slate-500">{form.summary.length}/1000</p>
        </div>
        <FormField id="contributingUrl" label="Contributing guide link" type="url" placeholder="https://" value={form.contributingUrl} onChange={change} />

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={handleDelete} disabled={remove.isPending} className="text-sm text-red-600 hover:underline disabled:opacity-60">
            Remove project
          </button>
        </div>
      </form>
    </section>
  );
}
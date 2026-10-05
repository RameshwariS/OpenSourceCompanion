import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile } from '../hooks/useProfile';
import FormField from '../components/FormField';

const textarea =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900';

export default function SettingsPage() {
  const { user } = useAuth();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? '',
    skills: (user.skills ?? []).join(', '),
    location: user.location ?? '',
    portfolioUrl: user.portfolioUrl ?? '',
    linkedinUrl: user.linkedinUrl ?? '',
  });
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    update.mutate({
      ...form,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything here is public on your{' '}
        <Link to={`/users/${user.username}`} className="text-emerald-500 hover:underline">
          profile page
        </Link>{' '}
        except your email, which is never shown.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField id="name" label="Name" required maxLength={80} value={form.name} onChange={change} />

        <div>
          <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
          <textarea id="bio" name="bio" rows={4} maxLength={500} value={form.bio} onChange={change} className={textarea} />
          <p className="mt-1 text-xs text-slate-500">{form.bio.length}/500</p>
        </div>

        <FormField id="skills" label="Skills (comma separated, max 15)" placeholder="Go, Docker, React" value={form.skills} onChange={change} />
        <FormField id="location" label="Location (optional)" maxLength={100} value={form.location} onChange={change} />
        <FormField id="portfolioUrl" label="Portfolio URL" type="url" placeholder="https://" value={form.portfolioUrl} onChange={change} />
        <FormField id="linkedinUrl" label="LinkedIn URL" type="url" placeholder="https://www.linkedin.com/in/…" value={form.linkedinUrl} onChange={change} />

        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
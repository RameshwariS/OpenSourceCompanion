import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import GitHubButton from '../components/GitHubButton';
import { getErrorMessage } from '../utils/getErrorMessage';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'contributor' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err)); // shows the server's validation message
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField id="name" label="Full name" autoComplete="name" required value={form.name} onChange={update} />
        <FormField id="username" label="Username" autoComplete="username" required value={form.username} onChange={update} />
        <FormField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update} />
        <FormField id="password" label="Password (8+ characters, a letter and a number)" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={update} />

        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            I am a…
          </label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={update}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="contributor">Contributor (I want to contribute)</option>
            <option value="maintainer">Maintainer (I maintain a project)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="my-6 text-center text-xs uppercase tracking-wide text-slate-500">or</div>
      <GitHubButton />

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-500 hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
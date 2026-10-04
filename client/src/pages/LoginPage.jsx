import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import GitHubButton from '../components/GitHubButton';
import { getErrorMessage } from '../utils/getErrorMessage';
import { OAUTH_ERRORS } from '../utils/oauthErrors';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(OAUTH_ERRORS[searchParams.get('error')] ?? '');
  const [submitting, setSubmitting] = useState(false);

  // Send the user back to the page they originally wanted
  const redirectTo = location.state?.from?.pathname ?? '/dashboard';

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={update} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="my-6 text-center text-xs uppercase tracking-wide text-slate-500">or</div>
      <GitHubButton />

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        New here?{' '}
        <Link to="/register" className="text-emerald-500 hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
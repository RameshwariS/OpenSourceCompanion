import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '🔍',
    title: 'Discover Issues',
    description:
      'Browse curated "good first issue" and "help wanted" tickets across thousands of repos, filtered by language, difficulty, and topic.',
  },
  {
    icon: '📌',
    title: 'Bookmark & Track',
    description:
      'Save issues you want to tackle and log your contributions — PRs, reviews, and comments — all in one place.',
  },
  {
    icon: '🏢',
    title: 'Follow Organisations',
    description:
      'Subscribe to the GitHub orgs you care about and get notified the moment a new beginner-friendly issue lands.',
  },
  {
    icon: '📊',
    title: 'Visualise Progress',
    description:
      'Activity heatmaps, language breakdowns, and contribution streaks show how far you have come at a glance.',
  },
  {
    icon: '🤝',
    title: 'Personalised Recommendations',
    description:
      'The engine matches open issues to your language preferences, skill level, and past contributions.',
  },
  {
    icon: '🔔',
    title: 'Real-time Notifications',
    description:
      'WebSocket-powered alerts keep you in the loop when issues are updated or your followed orgs post new work.',
  },
];

const STEPS = [
  { num: '01', title: 'Sign in with GitHub', body: 'One click — no passwords, no forms.' },
  { num: '02', title: 'Set your preferences', body: 'Pick your languages and experience level.' },
  { num: '03', title: 'Find your issue', body: 'Browse recommendations or search directly.' },
  { num: '04', title: 'Ship your PR', body: 'Log the contribution and watch your streak grow.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 pt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          🌱 Open Source Companion
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Land your first{' '}
          <span className="text-emerald-500">open-source contribution</span>
          <br className="hidden sm:block" /> — without the guesswork.
        </h1>

        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
          We surface beginner-friendly issues matched to your skills, let you track every
          contribution, and send real-time alerts so you never miss an opportunity.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <a
                href="/api/auth/github"
                className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
              >
                Continue with GitHub
              </a>
              <Link
                to="/issues"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              >
                Browse Issues
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="mx-auto w-full max-w-5xl px-4">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">
          Everything you need to contribute with confidence
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 p-6 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto w-full max-w-4xl px-4">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.num} className="flex flex-col gap-2">
              <span className="text-4xl font-black text-emerald-500/30 dark:text-emerald-400/20">
                {s.num}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CTA banner ── */}
      {!user && (
        <section className="mx-auto w-full max-w-3xl px-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-emerald-500 px-8 py-12 text-center text-white shadow-lg">
            <h2 className="text-2xl font-bold">Ready to make your mark?</h2>
            <p className="max-w-md text-emerald-100">
              Join developers who are shipping their first open-source PRs every day.
            </p>
            <a
              href="/api/auth/github"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              Get started — it's free
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
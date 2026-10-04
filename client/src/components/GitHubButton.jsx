// A plain <a>, not a React Router <Link>: OAuth needs a real browser navigation
// to the backend (which then redirects to github.com).
export default function GitHubButton({ href = '/api/auth/github', children = 'Continue with GitHub' }) {
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      {children}
    </a>
  );
}
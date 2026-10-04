import { Link, Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            OpenSource<span className="text-emerald-500">Companion</span>
          </Link>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
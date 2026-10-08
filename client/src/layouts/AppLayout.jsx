import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const linkClass = 'rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            OpenSource<span className="text-emerald-500">Companion</span>
          </Link>

          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link to="/issues" className={linkClass}>Issues</Link>
                <Link to="/projects" className={linkClass}>Projects</Link>
                <Link to="/bookmarks" className={linkClass}>Bookmarks</Link>
                <Link to="/my-contributions" className={linkClass}>My contributions</Link>
                <Link to="/pull-requests" className={linkClass}>Pull requests</Link>
                <Link to="/dashboard" className={linkClass}>Dashboard</Link>
                <Link to="/organizations" className={linkClass}>Organizations</Link>
                <Link to={`/users/${user.username}`} className={`${linkClass} hidden sm:inline`}>@{user.username}</Link>
                <Link to="/settings" className={linkClass}>Settings</Link>
                <button onClick={handleLogout} className={linkClass}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>
                  Log in
                </Link>
                <Link to="/register" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
                  Sign up
                </Link>
              </>
            )} {user && <NotificationBell />}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}

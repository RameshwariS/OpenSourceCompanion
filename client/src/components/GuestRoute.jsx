import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// For /login and /register: logged-in users get sent to the dashboard instead
export default function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <p className="py-20 text-center text-slate-500">Loading…</p>;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
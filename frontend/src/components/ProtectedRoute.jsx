import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageSpinner } from './ui/Spinner.jsx';

// Sin `roles` solo exige sesión; con `roles` además restringe por rol
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner label="Restaurando sesión…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/tickets" replace />;
  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Blocks every route this guard wraps — not just /app/* — until a forced password change is
  // done, so typing any protected URL directly can't bypass it (spec verification requirement).
  // The `pathname` check avoids redirecting /change-password to itself.
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

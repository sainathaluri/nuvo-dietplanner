import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RoleRoute({ roles }) {
  const { user } = useAuth();

  if (!roles.includes(user.role)) return <Navigate to="/portal" replace />;

  return <Outlet />;
}

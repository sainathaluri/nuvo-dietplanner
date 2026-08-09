import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { PortalLayout } from '@/pages/portal/PortalLayout';
import { OverviewPage } from '@/pages/portal/OverviewPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/portal',
    element: <ProtectedRoute />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <OverviewPage /> },
        ],
      },
    ],
  },
]);

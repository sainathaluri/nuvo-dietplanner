import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ServerErrorPage } from '@/pages/ServerErrorPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { ROUTE_ROLES } from '@/lib/portalNav';

// Named-export pages need a small adapter for React.lazy, which only understands a `default`
// export — keeps every page file's existing named-export convention instead of rewriting it.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const HomePage = lazyNamed(() => import('@/pages/HomePage'), 'HomePage');
const LoginPage = lazyNamed(() => import('@/pages/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('@/pages/RegisterPage'), 'RegisterPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const UnauthorizedPage = lazyNamed(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage');

const PortalLayout = lazyNamed(() => import('@/layouts/PortalLayout'), 'PortalLayout');
const OverviewPage = lazyNamed(() => import('@/pages/app/OverviewPage'), 'OverviewPage');
const MealsPage = lazyNamed(() => import('@/pages/app/MealsPage'), 'MealsPage');
const ProgressPage = lazyNamed(() => import('@/pages/app/ProgressPage'), 'ProgressPage');
const CallsPage = lazyNamed(() => import('@/pages/app/CallsPage'), 'CallsPage');
const ReportsPage = lazyNamed(() => import('@/pages/app/ReportsPage'), 'ReportsPage');
const ClientsPage = lazyNamed(() => import('@/pages/app/ClientsPage'), 'ClientsPage');
const PlanPage = lazyNamed(() => import('@/pages/app/PlanPage'), 'PlanPage');
const RecipesPage = lazyNamed(() => import('@/pages/app/RecipesPage'), 'RecipesPage');
const EnquiriesPage = lazyNamed(() => import('@/pages/app/EnquiriesPage'), 'EnquiriesPage');
const InsightsPage = lazyNamed(() => import('@/pages/app/InsightsPage'), 'InsightsPage');

// Wraps a single /app/<path> route in the RoleRoute guard for the roles that route belongs to
// (sourced from ROUTE_ROLES, which is derived from the nav config — never hand-duplicated).
function guarded(path, element) {
  return { element: <RoleRoute roles={ROUTE_ROLES[path]} />, children: [{ path, element }] };
}

export const router = createBrowserRouter([
  {
    // Applies to every descendant route — a render/loader throw anywhere in the tree lands here
    // instead of React Router's blank default error screen.
    errorElement: <ServerErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      {
        path: '/app',
        element: <ProtectedRoute />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              guarded('overview', <OverviewPage />),
              guarded('meals', <MealsPage />),
              guarded('progress', <ProgressPage />),
              guarded('calls', <CallsPage />),
              guarded('reports', <ReportsPage />),
              guarded('clients', <ClientsPage />),
              guarded('plan', <PlanPage />),
              guarded('recipes', <RecipesPage />),
              guarded('enquiries', <EnquiriesPage />),
              guarded('insights', <InsightsPage />),
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

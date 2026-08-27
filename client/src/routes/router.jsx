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
const HandoffPage = lazyNamed(() => import('@/pages/HandoffPage'), 'HandoffPage');
const ForgotPasswordPage = lazyNamed(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const ChangePasswordPage = lazyNamed(() => import('@/pages/ChangePasswordPage'), 'ChangePasswordPage');
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const UnauthorizedPage = lazyNamed(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage');

const PortalLayout = lazyNamed(() => import('@/layouts/PortalLayout'), 'PortalLayout');
const OverviewPage = lazyNamed(() => import('@/pages/app/OverviewPage'), 'OverviewPage');
const MealsPage = lazyNamed(() => import('@/pages/app/MealsPage'), 'MealsPage');
const ProgressPage = lazyNamed(() => import('@/pages/app/ProgressPage'), 'ProgressPage');
const CallsPage = lazyNamed(() => import('@/pages/app/CallsPage'), 'CallsPage');
const MessagesPage = lazyNamed(() => import('@/pages/app/MessagesPage'), 'MessagesPage');
const ReportsPage = lazyNamed(() => import('@/pages/app/ReportsPage'), 'ReportsPage');
const ClientsPage = lazyNamed(() => import('@/pages/app/ClientsPage'), 'ClientsPage');
const ClientProfilePage = lazyNamed(() => import('@/pages/app/ClientProfilePage'), 'ClientProfilePage');
const UsersPage = lazyNamed(() => import('@/pages/app/UsersPage'), 'UsersPage');
const DietitianProfilePage = lazyNamed(() => import('@/pages/app/DietitianProfilePage'), 'DietitianProfilePage');
const PlanPage = lazyNamed(() => import('@/pages/app/PlanPage'), 'PlanPage');
const PlansPage = lazyNamed(() => import('@/pages/app/PlansPage'), 'PlansPage');
const RecipesPage = lazyNamed(() => import('@/pages/app/RecipesPage'), 'RecipesPage');
const EnquiriesPage = lazyNamed(() => import('@/pages/app/EnquiriesPage'), 'EnquiriesPage');
const InsightsPage = lazyNamed(() => import('@/pages/app/InsightsPage'), 'InsightsPage');
const EmailLogPage = lazyNamed(() => import('@/pages/app/EmailLogPage'), 'EmailLogPage');

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
      { path: '/:companySlug/handoff', element: <HandoffPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/change-password', element: <ChangePasswordPage /> }],
      },
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
              guarded('messages', <MessagesPage />),
              guarded('reports', <ReportsPage />),
              guarded('clients', <ClientsPage />),
              // Not a nav entry (reached by clicking a client, not the sidebar) but guarded by the
              // same roles as the clients list itself — see ROUTE_ROLES in portalNav.js.
              { element: <RoleRoute roles={ROUTE_ROLES.clients} />, children: [{ path: 'clients/:id', element: <ClientProfilePage /> }] },
              guarded('users', <UsersPage />),
              // Not a nav entry (reached by clicking a dietitian row in Manage users) but guarded
              // by the same roles as that list itself — see ROUTE_ROLES in portalNav.js.
              {
                element: <RoleRoute roles={ROUTE_ROLES.users} />,
                children: [{ path: 'users/dietitians/:id', element: <DietitianProfilePage /> }],
              },
              guarded('plan', <PlanPage />),
              guarded('plans', <PlansPage />),
              guarded('recipes', <RecipesPage />),
              guarded('enquiries', <EnquiriesPage />),
              guarded('insights', <InsightsPage />),
              guarded('email-log', <EmailLogPage />),
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

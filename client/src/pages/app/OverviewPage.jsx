import { useAuth } from '@/hooks/useAuth';
import { ClientOverviewScreen } from '@/components/portal/client/ClientOverviewScreen';
import { AdminOverviewScreen } from '@/components/portal/admin/AdminOverviewScreen';
import { PlaceholderScreen } from '@/components/portal/shared/PlaceholderScreen';

export function OverviewPage() {
  const { user } = useAuth();

  if (user.role === 'client') return <ClientOverviewScreen />;
  if (user.role === 'admin') return <AdminOverviewScreen />;

  return (
    <PlaceholderScreen
      eyebrow="DASHBOARD"
      title="Your dietitian dashboard"
      description="The real dashboard (today's appointments, client momentum, etc.) is ported from legacy/app.js in a later phase."
    />
  );
}

import { Outlet } from 'react-router-dom';
import { PortalSidebar } from '@/components/portal/shared/PortalSidebar';
import { PortalHeader } from '@/components/portal/shared/PortalHeader';

export function PortalLayout() {
  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-[#f7f8f3]">
      <PortalSidebar />
      <div className="overflow-auto">
        <PortalHeader />
        <Outlet />
      </div>
    </div>
  );
}

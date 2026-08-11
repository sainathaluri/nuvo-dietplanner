import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/portal/shared/Sidebar';
import { PortalHeader } from '@/components/portal/shared/PortalHeader';

export function PortalLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="grid min-h-screen bg-[#f7f8f3] min-[1050px]:grid-cols-[248px_1fr]">
      <aside className="hidden min-[1050px]:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-screen flex-col overflow-auto">
        <PortalHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 border-none bg-forest p-0 text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

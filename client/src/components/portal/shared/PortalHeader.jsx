import { useAuth } from '@/hooks/useAuth';

export function PortalHeader() {
  const { user } = useAuth();

  return (
    <header className="flex h-18 items-center justify-between border-b border-line bg-white/85 px-9">
      <span className="text-sm text-muted">
        {user.role[0].toUpperCase() + user.role.slice(1)} portal
      </span>
      <div className="flex items-center gap-2 text-sm">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-coral font-semibold text-white">
          {user.name[0]}
        </div>
        {user.name}
      </div>
    </header>
  );
}

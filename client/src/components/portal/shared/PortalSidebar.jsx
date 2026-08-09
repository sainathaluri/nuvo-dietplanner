import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const NAV_BY_ROLE = {
  client: [
    ['overview', 'Overview'],
    ['meals', "This week's meals"],
    ['progress', 'My progress'],
  ],
  dietitian: [
    ['overview', 'Dashboard'],
    ['clients', 'Clients'],
    ['builder', 'Weekly plan'],
    ['recipes', 'Recipe library'],
  ],
  admin: [
    ['overview', 'Business overview'],
    ['enquiries', 'Enquiry pipeline'],
    ['clients', 'Clients'],
    ['recipes', 'Recipe library'],
  ],
};

export function PortalSidebar() {
  const { user, logout } = useAuth();
  const items = NAV_BY_ROLE[user.role] ?? [];

  return (
    <aside className="flex h-screen w-62 flex-col bg-forest p-5 text-white">
      <span className="mb-10 font-display text-xl">✦ nourishly</span>
      <nav className="grid gap-1">
        {items.map(([id, label]) => (
          <NavLink
            key={id}
            to={`/portal/${id}`}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-forest-2 text-white' : 'text-sage/80 hover:bg-forest-2/60'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} className="mt-auto text-left text-xs text-sage/70 hover:text-white">
        ← Log out
      </button>
    </aside>
  );
}

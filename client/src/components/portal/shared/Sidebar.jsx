import { Link, NavLink } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { NAV_BY_ROLE } from '@/lib/portalNav';

// Rendered both as the fixed desktop aside and inside the mobile Sheet drawer — onNavigate lets
// the drawer close itself when a link is clicked.
export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV_BY_ROLE[user.role] ?? [];
  // Admin isn't a party to any conversation (spec §1.5) — messaging is client <-> dietitian only.
  const canMessage = user.role === 'client' || user.role === 'dietitian';
  const { data: unread } = useUnreadMessageCount(canMessage);
  const unreadCount = unread?.count ?? 0;

  return (
    <div className="flex h-full flex-col bg-forest p-5 text-white">
      <Link to="/" className="mb-10 inline-block font-display text-xl">
        ✦ nourishly
      </Link>

      <nav className="grid gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
                isActive ? 'bg-forest-2 text-white' : 'text-sage/80 hover:bg-forest-2/60'
              }`
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
            {to === '/app/messages' && unreadCount > 0 && (
              <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-coral text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto grid gap-4">
        <Link to="/" className="text-xs text-sage/70 hover:text-white">
          ← Back to website
        </Link>

        <div className="rounded-xl bg-forest-2/70 p-4 text-sm">
          <MessageCircle className="mb-2 size-5 text-yellow" aria-hidden="true" />
          <p className="font-semibold">Need a hand?</p>
          <p className="mt-1 text-xs text-sage/80">Your care team is here.</p>
          {canMessage ? (
            <Link
              to="/app/messages"
              onClick={onNavigate}
              className="mt-3 block w-full rounded-full bg-white/10 py-1.5 text-center text-xs font-semibold hover:bg-white/20"
            >
              Message us
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast('Messaging is client <-> dietitian only.')}
              className="mt-3 w-full rounded-full bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              Message us
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

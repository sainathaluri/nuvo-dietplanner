import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useUsers } from '@/hooks/useUsers';
import { useDietitians } from '@/hooks/useClients';
import { UserFormDialog } from './UserFormDialog';
import { UserEditDialog } from './UserEditDialog';

const ROLE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Clients' },
  { value: 'dietitian', label: 'Dietitians' },
  { value: 'admin', label: 'Admins' },
];

const ROLE_TONE = { client: 'outline', dietitian: 'secondary', admin: 'default' };

export function UsersScreen() {
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading, isError, refetch } = useUsers(roleFilter === 'all' ? undefined : { role: roleFilter });
  const { data: dietitians } = useDietitians();

  const visible = (data ?? []).filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const dietitianName = (id) => dietitians?.find((d) => d._id === id)?.name;

  return (
    <div className="mx-auto max-w-4xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{data ? `${data.length} ${data.length === 1 ? 'account' : 'accounts'}` : ''}</p>
          <h1 className="mt-1 text-3xl text-forest">Manage users</h1>
          <p className="mt-1 text-muted-foreground">Add clients, dietitians, and admins, and assign clients to a dietitian.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-full bg-coral text-white hover:bg-coral/90">
          <UserPlus className="size-4" aria-hidden="true" />
          Add user
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-sage/40 p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRoleFilter(tab.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                roleFilter === tab.value ? 'bg-white text-forest shadow-soft' : 'text-forest/70 hover:text-forest'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load users"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={data?.length ? 'No users match' : 'No users yet'}
          description={data?.length ? 'Try a different search.' : 'Add your first user to get started.'}
        />
      ) : (
        <div className="grid gap-2">
          {visible.map((u) => (
            <div key={u._id} className="flex items-center gap-3 rounded-card bg-white p-4 shadow-soft">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
                {u.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="text-forest">{u.name}</strong>
                  <Badge variant={ROLE_TONE[u.role]} className="capitalize">
                    {u.role}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {u.email}
                  {u.role === 'client' && (
                    <> · {u.assignedDietitian ? `Works with ${dietitianName(u.assignedDietitian) ?? '…'}` : 'No dietitian yet'}</>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditing(u)}
                className="shrink-0 text-sm font-semibold text-forest hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && <UserEditDialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} user={editing} />}
    </div>
  );
}

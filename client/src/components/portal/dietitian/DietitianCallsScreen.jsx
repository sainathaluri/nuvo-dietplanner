import { useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useCalls } from '@/hooks/useCalls';
import { splitCalls } from '@/lib/clientPortal';
import { DietitianCallCard } from './DietitianCallCard';
import { DietitianCallFormDialog } from './DietitianCallFormDialog';

export function DietitianCallsScreen() {
  const { data, isLoading, isError, refetch } = useCalls();
  const [dialog, setDialog] = useState(null); // { mode: 'schedule' | 'reschedule', call? }

  const { upcoming, past } = splitCalls(data);

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Stay close to your clients</p>
          <h1 className="mt-1 text-3xl text-forest">Schedule calls</h1>
          <p className="mt-1 text-muted-foreground">Book, reschedule, or wrap up a client check-in.</p>
        </div>
        <Button onClick={() => setDialog({ mode: 'schedule' })} className="rounded-full bg-coral text-white hover:bg-coral/90">
          + Schedule a call
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load calls"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <div className="grid gap-8">
          <section>
            <h2 className="mb-3 text-lg text-forest">Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState icon={PhoneOff} title="No upcoming calls" description="Schedule a check-in with a client." />
            ) : (
              <div className="grid gap-3">
                {upcoming.map((call) => (
                  <DietitianCallCard key={call._id} call={call} onReschedule={() => setDialog({ mode: 'reschedule', call })} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg text-forest">Past</h2>
              <div className="grid gap-3">
                {past.map((call) => (
                  <DietitianCallCard key={call._id} call={call} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <DietitianCallFormDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        mode={dialog?.mode}
        call={dialog?.call}
      />
    </div>
  );
}

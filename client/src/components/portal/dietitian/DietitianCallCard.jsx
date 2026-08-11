import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useUpdateCall } from '@/hooks/useCalls';
import { formatDate, formatTime } from '@/lib/format';

const STATUS_VARIANT = { scheduled: 'default', completed: 'secondary', cancelled: 'outline' };

export function DietitianCallCard({ call, onReschedule }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const updateCall = useUpdateCall();
  const isScheduled = call.status === 'scheduled';

  function setStatus(status) {
    updateCall.mutate(
      { callId: call._id, status },
      {
        onSuccess: () => toast.success(status === 'completed' ? 'Marked complete.' : 'Call cancelled.'),
        onError: () => toast.error("That didn't save — please try again."),
      }
    );
    setConfirmingCancel(false);
  }

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
            {call.client?.name?.[0] ?? 'C'}
          </div>
          <div>
            <strong className="block text-sm text-forest">{call.client?.name ?? 'Client'}</strong>
            <span className="text-xs text-muted-foreground">
              {formatDate(call.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short' })} · {formatTime(call.scheduledAt)}
            </span>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[call.status]} className="capitalize">
          {call.status}
        </Badge>
      </div>

      {call.notes && <p className="mt-2 text-sm text-forest">{call.notes}</p>}

      {isScheduled && (
        <div className="mt-4 flex items-center gap-4">
          {confirmingCancel ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-forest">Cancel this call?</span>
              <button type="button" onClick={() => setStatus('cancelled')} className="font-semibold text-destructive hover:underline">
                Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirmingCancel(false)} className="text-muted-foreground hover:underline">
                Never mind
              </button>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setStatus('completed')} className="text-sm font-semibold text-sage-deep hover:underline">
                Mark complete
              </button>
              <button type="button" onClick={onReschedule} className="text-sm font-semibold text-forest hover:underline">
                Reschedule
              </button>
              <button type="button" onClick={() => setConfirmingCancel(true)} className="text-sm font-semibold text-destructive hover:underline">
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

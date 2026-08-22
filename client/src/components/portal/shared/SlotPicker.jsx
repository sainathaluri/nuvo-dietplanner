import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAvailableSlots } from '@/hooks/useCalls';
import { formatTime } from '@/lib/format';

export function todayDateValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Fully controlled: the parent dialog owns both `date` (which day's grid to show) and `value`
// (the selected slot's ISO string, wired to a react-hook-form field) — this mirrors how those
// dialogs already reset their form via a `useEffect` keyed on `open`, so resetting `date` there
// too keeps one reset mechanism instead of SlotPicker inventing its own.
//
// dietitianId: whose availability to query. excludeCallId: pass the call's own id when
// rescheduling so its current slot doesn't count against itself (server returns it as available).
export function SlotPicker({ dietitianId, excludeCallId, date, onDateChange, value, onChange }) {
  const { data, isLoading, isError } = useAvailableSlots({ dietitianId, date, excludeCallId });

  return (
    <div className="grid gap-3">
      <Input type="date" min={todayDateValue()} value={date} onChange={(e) => onDateChange(e.target.value)} />

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn't load available times — please try again.</p>
      ) : data.slots.length === 0 ? (
        <EmptyState title="No available times" description="Try a different date." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.slots.map((slot) => (
            <Button
              key={slot}
              type="button"
              size="sm"
              variant={slot === value ? 'default' : 'outline'}
              onClick={() => onChange(slot)}
            >
              {formatTime(slot)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

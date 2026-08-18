import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CallScheduleFields } from '@/components/portal/shared/CallScheduleFields';
import { ClientField } from './ClientField';
import { useClients } from '@/hooks/useClients';
import { useCreateCall, useUpdateCall } from '@/hooks/useCalls';
import { toDatetimeLocalValue } from '@/lib/format';
import { reminderValueToMinutes } from '@/lib/callScheduling';

const scheduleSchema = z.object({
  client: z.string().min(1, 'Choose a client'),
  scheduledAt: z.string().min(1, 'Choose a date and time'),
  notes: z.string().optional(),
  frequency: z.string(),
  reminderMinutesBefore: z.string(),
});
const rescheduleSchema = z.object({ scheduledAt: z.string().min(1, 'Choose a date and time') });

function defaultTime() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

// mode: 'schedule' (new call, pick a client) | 'reschedule' (change scheduledAt on an existing one)
export function DietitianCallFormDialog({ open, onOpenChange, mode, call }) {
  const isReschedule = mode === 'reschedule';
  const clientsQuery = useClients();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const isPending = isReschedule ? updateCall.isPending : createCall.isPending;

  const form = useForm({
    resolver: zodResolver(isReschedule ? rescheduleSchema : scheduleSchema),
    defaultValues: { client: '', scheduledAt: defaultTime(), notes: '', frequency: 'once', reminderMinutesBefore: '30' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      client: '',
      scheduledAt: isReschedule && call ? toDatetimeLocalValue(call.scheduledAt) : defaultTime(),
      notes: '',
      frequency: 'once',
      reminderMinutesBefore: '30',
    });
  }, [open, isReschedule, call, form]);

  function onSubmit(values) {
    const scheduledAt = new Date(values.scheduledAt).toISOString();

    if (isReschedule) {
      updateCall.mutate(
        { callId: call._id, scheduledAt },
        {
          onSuccess: () => {
            toast.success('Call rescheduled.');
            onOpenChange(false);
          },
          onError: () => toast.error("We couldn't reschedule that — please try again."),
        }
      );
      return;
    }

    createCall.mutate(
      {
        client: values.client,
        scheduledAt,
        notes: values.notes || undefined,
        frequency: values.frequency,
        reminderMinutesBefore: reminderValueToMinutes(values.reminderMinutesBefore),
      },
      {
        onSuccess: () => {
          toast.success('Call scheduled.');
          onOpenChange(false);
        },
        onError: () => toast.error("We couldn't schedule that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isReschedule ? 'Reschedule call' : 'Schedule a call'}</DialogTitle>
          <DialogDescription>
            {isReschedule ? 'Pick a new time for this check-in.' : 'Book a check-in with one of your clients.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            {!isReschedule && <ClientField control={form.control} clients={clientsQuery.data} />}
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date &amp; time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isReschedule && (
              <>
                <CallScheduleFields control={form.control} />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button type="submit" disabled={isPending} className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90">
              {isPending ? 'Saving…' : isReschedule ? 'Save new time' : 'Schedule call'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

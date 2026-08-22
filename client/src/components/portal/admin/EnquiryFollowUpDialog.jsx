import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlotPicker, todayDateValue } from '@/components/portal/shared/SlotPicker';
import { useDietitians } from '@/hooks/useClients';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';
import { PLAN_DURATIONS } from '@/lib/planDurations';

// A lead only ever gets a client account created once — the password/plan fields are only shown
// (and only required, via manual form.setError in onSubmit — needsAccount isn't a form field, so
// zod can't see it) the first time either "Follow-up" or "Converted" is reached.
const schema = z.object({
  dietitian: z.string().min(1, 'Choose a dietitian'),
  scheduledAt: z.string().min(1, 'Choose an available time'),
  planId: z.string().optional(),
  planDuration: z.string().optional(),
  password: z.string().optional(),
  note: z.string().optional(),
});

// enquiry: the card being moved to "Follow-up" (never null while open).
export function EnquiryFollowUpDialog({ open, onOpenChange, enquiry }) {
  const needsAccount = !enquiry.convertedUserId;
  const updateEnquiry = useUpdateEnquiry();
  const { data: dietitians } = useDietitians();
  const { data: programPlans } = useProgramPlans({ activeOnly: true });
  const [date, setDate] = useState(todayDateValue());

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { dietitian: '', scheduledAt: '', planId: '', planDuration: '', password: '', note: '' },
  });
  const dietitian = form.watch('dietitian');

  useEffect(() => {
    if (!open) return;
    form.reset({ dietitian: '', scheduledAt: '', planId: '', planDuration: '', password: '', note: '' });
    setDate(todayDateValue());
  }, [open, form]);

  function onSubmit(values) {
    if (needsAccount && (!values.planId || !values.planDuration || !values.password)) {
      if (!values.planId) form.setError('planId', { message: 'Choose a plan' });
      if (!values.planDuration) form.setError('planDuration', { message: 'Choose a duration' });
      if (!values.password) form.setError('password', { message: 'Set a temporary password' });
      return;
    }

    updateEnquiry.mutate(
      {
        enquiryId: enquiry._id,
        status: 'follow-up',
        dietitian: values.dietitian,
        scheduledAt: values.scheduledAt,
        note: values.note || undefined,
        ...(needsAccount && { planId: values.planId, planDuration: values.planDuration, password: values.password }),
      },
      {
        onSuccess: () => {
          toast.success('Follow-up call scheduled.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't schedule that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a follow-up for {enquiry.name}</DialogTitle>
          <DialogDescription>
            {needsAccount
              ? 'This creates their client account and books a real call.'
              : 'Books a real call on their existing account.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="dietitian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietitian</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a dietitian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(dietitians ?? []).map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {dietitian && (
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date &amp; time</FormLabel>
                    <FormControl>
                      <SlotPicker
                        dietitianId={dietitian}
                        date={date}
                        onDateChange={setDate}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {needsAccount && (
              <>
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(programPlans ?? []).map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan duration</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLAN_DURATIONS.map((duration) => (
                            <SelectItem key={duration} value={duration}>
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateEnquiry.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateEnquiry.isPending ? 'Saving…' : 'Schedule follow-up'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

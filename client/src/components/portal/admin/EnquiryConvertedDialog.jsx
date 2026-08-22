import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';
import { PLAN_DURATIONS } from '@/lib/planDurations';

// Only ever opened when the enquiry doesn't have a client account yet — see
// EnquiryPipelineScreen.jsx's requestStatusChange, which skips this dialog (fires the mutation
// immediately) once an account already exists from an earlier Follow-up.
const schema = z.object({
  planId: z.string().min(1, 'Choose a plan'),
  planDuration: z.string().min(1, 'Choose a duration'),
  password: z.string().min(8, 'At least 8 characters'),
});

// enquiry: the card being moved to "Converted" (never null while open).
export function EnquiryConvertedDialog({ open, onOpenChange, enquiry }) {
  const updateEnquiry = useUpdateEnquiry();
  const { data: programPlans } = useProgramPlans({ activeOnly: true });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { planId: '', planDuration: '', password: '' } });

  useEffect(() => {
    if (open) form.reset({ planId: '', planDuration: '', password: '' });
  }, [open, form]);

  function onSubmit(values) {
    updateEnquiry.mutate(
      { enquiryId: enquiry._id, status: 'converted', ...values },
      {
        onSuccess: () => {
          toast.success(`${enquiry.name} is now a client.`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convert {enquiry.name} to a client</DialogTitle>
          <DialogDescription>Creates their account. They'll pick a dietitian after logging in.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
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
            <Button
              type="submit"
              disabled={updateEnquiry.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateEnquiry.isPending ? 'Saving…' : 'Convert to client'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

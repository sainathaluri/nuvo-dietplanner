import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDietitians } from '@/hooks/useClients';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useUpdateUser } from '@/hooks/useUsers';
import { PLAN_DURATIONS } from '@/lib/planDurations';

const schema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']),
  assignedDietitian: z.string().optional(),
  programPlan: z.string().optional(),
  planDuration: z.string().optional(),
});

function toFormValues(user) {
  return {
    role: user.role,
    assignedDietitian: user.assignedDietitian ?? 'none',
    programPlan: user.programPlan?._id ?? user.programPlan ?? 'none',
    planDuration: user.planDuration ?? 'none',
  };
}

// user: the user row being edited (never null while open).
export function UserEditDialog({ open, onOpenChange, user }) {
  const updateUser = useUpdateUser();
  const { data: dietitians } = useDietitians();
  // Unlike the create dialog, this fetches every plan (not just active ones) — otherwise a client
  // already on a plan that's since been deactivated would show a blank Select instead of their
  // actual current plan.
  const { data: programPlans } = useProgramPlans();

  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(user) });
  const role = form.watch('role');

  useEffect(() => {
    if (open) form.reset(toFormValues(user));
  }, [open, user, form]);

  function onSubmit(values) {
    updateUser.mutate(
      {
        userId: user._id,
        role: values.role,
        assignedDietitian: values.role === 'client' && values.assignedDietitian !== 'none' ? values.assignedDietitian : null,
        programPlan: values.role === 'client' && values.programPlan !== 'none' ? values.programPlan : null,
        planDuration: values.role === 'client' && values.planDuration !== 'none' ? values.planDuration : null,
      },
      {
        onSuccess: () => {
          toast.success(`${user.name}'s account was updated.`);
          onOpenChange(false);
        },
        onError: () => toast.error("We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="dietitian">Dietitian</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'client' && (
              <>
                <FormField
                  control={form.control}
                  name="assignedDietitian"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned dietitian</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
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
                <FormField
                  control={form.control}
                  name="programPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No plan</SelectItem>
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
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
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
              </>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateUser.isPending}
                className="rounded-full bg-coral text-white hover:bg-coral/90"
              >
                {updateUser.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

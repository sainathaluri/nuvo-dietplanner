import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDietitians } from '@/hooks/useClients';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useCreateUser } from '@/hooks/useUsers';
import { PLAN_DURATIONS } from '@/lib/planDurations';

const schema = z.object({
  name: z.string().min(1, 'Enter a name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role: z.enum(['client', 'dietitian', 'admin']),
  assignedDietitian: z.string().optional(),
  programPlan: z.string().optional(),
  planDuration: z.string().optional(),
});

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'client',
  assignedDietitian: 'none',
  programPlan: 'none',
  planDuration: 'none',
};

// Admin-only: create a new client, dietitian, or admin account directly (no self-registration needed).
export function UserFormDialog({ open, onOpenChange }) {
  const createUser = useCreateUser();
  const { data: dietitians } = useDietitians();
  const { data: programPlans } = useProgramPlans({ activeOnly: true });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const role = form.watch('role');

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  function onSubmit(values) {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      assignedDietitian: values.role === 'client' && values.assignedDietitian !== 'none' ? values.assignedDietitian : null,
      programPlan: values.role === 'client' && values.programPlan !== 'none' ? values.programPlan : null,
      planDuration: values.role === 'client' && values.planDuration !== 'none' ? values.planDuration : null,
    };

    createUser.mutate(payload, {
      onSuccess: () => {
        toast.success(`${values.name} was added as a ${values.role}.`);
        onOpenChange(false);
      },
      onError: (error) => {
        const message = error.response?.status === 409 ? 'That email is already registered.' : "We couldn't add that user — please try again.";
        toast.error(message);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>Create a client, dietitian, or admin account directly.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Their full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="them@example.com" {...field} />
                  </FormControl>
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
                      <FormLabel>Assign a dietitian (optional)</FormLabel>
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
                      <FormLabel>Plan (optional)</FormLabel>
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
                      <FormLabel>Plan duration (optional)</FormLabel>
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
                disabled={createUser.isPending}
                className="rounded-full bg-coral text-white hover:bg-coral/90"
              >
                {createUser.isPending ? 'Adding…' : 'Add user'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

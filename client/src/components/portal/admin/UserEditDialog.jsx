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
import { useUpdateUser } from '@/hooks/useUsers';

const schema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']),
  assignedDietitian: z.string().optional(),
});

function toFormValues(user) {
  return { role: user.role, assignedDietitian: user.assignedDietitian ?? 'none' };
}

// user: the user row being edited (never null while open).
export function UserEditDialog({ open, onOpenChange, user }) {
  const updateUser = useUpdateUser();
  const { data: dietitians } = useDietitians();

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

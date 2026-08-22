import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { getPortalHome } from '@/lib/portalHome';
import { getAuthErrorMessage } from '@/lib/authError';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const user = await login(values);
      const from = location.state?.from;
      navigate(from?.pathname ? `${from.pathname}${from.search ?? ''}` : getPortalHome(user.role), {
        replace: true,
      });
    } catch (error) {
      setServerError(getAuthErrorMessage(error, { fallback: "We couldn't log you in. Please try again." }));
    }
  };

  return (
    <AuthLayout eyebrow="WELCOME BACK" title="Log in to Nourishly" subtitle="Pick up right where you left off.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link to="/forgot-password" className="text-xs font-semibold text-forest hover:underline">
                    Forgot your password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-2 w-full rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {form.formState.isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}

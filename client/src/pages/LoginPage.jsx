import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values);
      navigate('/portal');
    } catch {
      setServerError('Invalid email or password.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm rounded-card bg-white p-8 shadow-soft">
        <h1 className="text-2xl">Welcome back</h1>
        <p className="mb-6 text-sm text-muted">Log in to your Nourishly portal.</p>

        <label className="mb-4 block text-sm font-semibold">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-line p-2.5 text-sm"
            {...register('email')}
          />
          {errors.email && <span className="mt-1 block text-xs text-destructive">{errors.email.message}</span>}
        </label>

        <label className="mb-6 block text-sm font-semibold">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-line p-2.5 text-sm"
            {...register('password')}
          />
          {errors.password && (
            <span className="mt-1 block text-xs text-destructive">{errors.password.message}</span>
          )}
        </label>

        {serverError && <p className="mb-4 text-sm text-destructive">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-coral text-white">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </main>
  );
}

'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@igaming/contracts';
import { useLogin } from '@igaming/api-client';
import { Button, Input, Label, Skeleton } from '@igaming/ui';
import { AuthCard } from '@/components/auth/auth-card';
import { DemoCredentials } from '@/components/auth/demo-credentials';
import { describeError } from '@/lib/errors';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace(next);
    } catch {
      form.setError('root', { message: describeError(login.error ?? undefined, 'Sign in failed') });
    }
  });

  return (
    <AuthCard
      title="Sign in"
      description="Use your demo account to place bets with virtual credits."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            data-testid="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...form.register('email')}
          />
          {errors.email ? (
            <p id="login-email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            data-testid="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...form.register('password')}
          />
          {errors.password ? (
            <p id="login-password-error" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>
        {errors.root ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errors.root.message}
          </p>
        ) : null}
        <Button
          type="submit"
          data-testid="login-submit"
          className="w-full"
          loading={isSubmitting || login.isPending}
        >
          Sign in
        </Button>
      </form>
      <DemoCredentials />
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link
          href={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-brand hover:underline"
        >
          Create a demo account
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
      <LoginForm />
    </React.Suspense>
  );
}

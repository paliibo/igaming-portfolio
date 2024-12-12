'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@igaming/contracts';
import { useLogin, useMe } from '@igaming/api-client';
import { Button, Input, Label } from '@igaming/ui';
import { describeError } from '@/lib/game-meta';
import { AuthCard, DemoCredentials } from './auth-card';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const me = useMe();
  const login = useLogin();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    if (me.data) router.replace(next);
  }, [me.data, router, next]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: () => router.replace(next),
      onError: (error) => setServerError(describeError(error)),
    });
  });

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Your wallet, favourites and history sync across LinePulse, SpinHarbor and LedgerArc."
      footer={
        <>
          New here?{' '}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Create a demo account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            data-testid="login-email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            data-testid="login-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        {serverError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          data-testid="login-submit"
          loading={login.isPending}
        >
          Sign in
        </Button>
      </form>
      <DemoCredentials />
    </AuthCard>
  );
}

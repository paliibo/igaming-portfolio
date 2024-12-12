'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@igaming/contracts';
import { useMe, useRegister } from '@igaming/api-client';
import { Button, Input, Label } from '@igaming/ui';
import { describeError } from '@/lib/game-meta';
import { AuthCard, DemoCredentials } from './auth-card';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const me = useMe();
  const register = useRegister();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  React.useEffect(() => {
    if (me.data) router.replace(next);
  }, [me.data, router, next]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    register.mutate(values, {
      onSuccess: () => router.replace(next),
      onError: (error) => setServerError(describeError(error)),
    });
  });

  const errors = form.formState.errors;

  return (
    <AuthCard
      title="Create a demo account"
      description="Registration gives you a welcome balance of virtual credits. No email verification, nothing real at stake."
      footer={
        <>
          Already registered?{' '}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="register-name">Display name</Label>
          <Input
            id="register-name"
            autoComplete="nickname"
            aria-invalid={Boolean(errors.displayName)}
            {...form.register('displayName')}
          />
          {errors.displayName ? (
            <p className="text-xs text-destructive">{errors.displayName.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...form.register('email')}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register('password')}
          />
          <p className="text-xs text-muted-foreground">8 to 128 characters.</p>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
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
        <Button type="submit" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>
      <DemoCredentials />
    </AuthCard>
  );
}

'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@igaming/contracts';
import { useRegister } from '@igaming/api-client';
import { Button, Input, Label, Skeleton } from '@igaming/ui';
import { AuthCard } from '@/components/auth/auth-card';
import { describeError } from '@/lib/errors';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const register = useRegister();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
      router.replace(next);
    } catch (error) {
      form.setError('root', { message: describeError(error, 'Registration failed') });
    }
  });

  const field = (
    name: keyof RegisterInput,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => {
    const error = errors[name];
    const id = `register-${name}`;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
          {...form.register(name)}
        />
        {error ? (
          <p id={`${id}-error`} className="text-xs text-destructive">
            {error.message}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <AuthCard
      title="Create a demo account"
      description="You get a welcome balance of virtual DMO credits. No real money is involved."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        {field('displayName', 'Display name', {
          type: 'text',
          autoComplete: 'nickname',
          maxLength: 40,
        })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', {
          type: 'password',
          autoComplete: 'new-password',
          placeholder: 'At least 8 characters',
        })}
        {errors.root ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errors.root.message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={isSubmitting || register.isPending}>
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link
          href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
      <RegisterForm />
    </React.Suspense>
  );
}

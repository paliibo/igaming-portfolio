'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark } from 'lucide-react';
import { ApiError, useLogin, useMe } from '@igaming/api-client';
import { loginSchema, type LoginInput } from '@igaming/contracts';
import { Button, Input, Label } from '@igaming/ui';

const DEMO_ACCOUNTS: { role: string; email: string; password: string; note: string }[] = [
  {
    role: 'Operator',
    email: 'operator@demo.local',
    password: 'Operator123!',
    note: 'Read everything, manage players, limits and alerts',
  },
  {
    role: 'Admin',
    email: 'admin@demo.local',
    password: 'Admin123!',
    note: 'Operator rights plus balance adjustments, journal reversals and demo reset',
  },
];

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const me = useMe();
  const login = useLogin();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    if (me.data && me.data.role !== 'PLAYER') router.replace(next);
  }, [me.data, next, router]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: ({ user }) => {
        if (user.role === 'PLAYER') {
          setServerError(
            'This is a player account. LedgerArc requires an operator or admin account.',
          );
          return;
        }
        router.replace(next);
      },
      onError: (error) => {
        setServerError(
          ApiError.is(error) && error.status === 429
            ? 'Too many attempts. Wait a minute and try again.'
            : error.message,
        );
      },
    });
  });

  const fill = (email: string, password: string) => {
    form.setValue('email', email, { shouldValidate: true });
    form.setValue('password', password, { shouldValidate: true });
    form.setFocus('password');
  };

  return (
    <main className="flex min-h-screen">
      <section className="hidden w-[42%] flex-col justify-between bg-surface p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">LedgerArc</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Wallet, ledger and operations back office
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Every player balance is derived from a double-entry journal. Review transactions, verify
            that the ledger balances, manage responsible-gaming limits and act on risk alerts from
            one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/75">
            <li>· Journal entries with per-entry balance checks and audited reversals</li>
            <li>· Player status, KYC, deposit and loss limits</li>
            <li>· Daily financial reports with explicit accounting definitions</li>
          </ul>
        </div>
        <p className="text-xs text-white/45">
          Demo environment · virtual DMO credits only · no real money is involved
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold">LedgerArc</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operator or administrator account required.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                data-testid="login-email"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                data-testid="login-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {serverError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              loading={login.isPending}
              data-testid="login-submit"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo credentials
            </p>
            <ul className="mt-3 space-y-3">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{account.role}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {account.email} · {account.password}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{account.note}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fill(account.email, account.password)}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

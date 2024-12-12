'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useLogout, useMe } from '@igaming/api-client';
import type { UserDto } from '@igaming/contracts';
import { Button, ErrorState, Skeleton } from '@igaming/ui';
import { errorMessage } from '@/components/common/list-state';

const StaffUserContext = React.createContext<UserDto | null>(null);

/** The signed-in operator/admin. Only available inside `RequireAuth`. */
export function useStaffUser(): UserDto {
  const user = React.useContext(StaffUserContext);
  if (!user) throw new Error('useStaffUser must be used inside RequireAuth');
  return user;
}

export function useIsAdmin(): boolean {
  return useStaffUser().role === 'ADMIN';
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy aria-label="Loading">
      <div className="hidden w-60 bg-surface lg:block" />
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64" />
      </div>
    </div>
  );
}

function AccessDenied({ email }: { email: string }) {
  const router = useRouter();
  const logout = useLogout();
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Operator access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          LedgerArc is the back office for operators and administrators. You are signed in as{' '}
          <span className="font-medium text-foreground">{email}</span>, a player account, which
          cannot view wallet, ledger or risk data.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            loading={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace('/login') })}
          >
            Sign in as an operator
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextPath = React.useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  React.useEffect(() => {
    if (me.isSuccess && me.data === null)
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [me.isSuccess, me.data, router, nextPath]);

  if (me.isPending) return <ShellSkeleton />;
  if (me.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <ErrorState
          className="w-full max-w-md"
          title="Could not load your session"
          message={errorMessage(me.error)}
          onRetry={() => void me.refetch()}
        />
      </main>
    );
  }
  if (!me.data) return <ShellSkeleton />;
  if (me.data.role === 'PLAYER') return <AccessDenied email={me.data.email} />;
  return <StaffUserContext.Provider value={me.data}>{children}</StaffUserContext.Provider>;
}

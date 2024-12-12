'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@igaming/contracts';
import { useMe } from '@igaming/api-client';
import { EmptyState, ErrorState, Skeleton } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const unauthenticated = me.isSuccess && me.data === null;

  React.useEffect(() => {
    if (unauthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthenticated, router, pathname]);

  if (me.isError)
    return (
      <ErrorState
        title="Could not verify your session"
        message={me.error.message}
        onRetry={() => void me.refetch()}
      />
    );
  if (me.isLoading || unauthenticated || !me.data) return <PageSkeleton />;
  if (roles && !roles.includes(me.data.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        description={`This area is for ${roles.join(' and ').toLowerCase()} accounts. You are signed in as ${me.data.displayName} (${me.data.role.toLowerCase()}).`}
        action={
          <LinkButton variant="outline" href="/">
            Back to the casino
          </LinkButton>
        }
      />
    );
  }
  return <>{children}</>;
}

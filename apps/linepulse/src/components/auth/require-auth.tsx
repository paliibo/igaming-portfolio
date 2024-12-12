'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import type { Role, UserDto } from '@igaming/contracts';
import { useMe } from '@igaming/api-client';
import { EmptyState, ErrorState, Skeleton } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

interface RequireAuthProps {
  roles?: Role[];
  children: (user: UserDto) => React.ReactNode;
}

export function RequireAuth({ roles, children }: RequireAuthProps) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const shouldRedirect = me.isSuccess && me.data === null;

  React.useEffect(() => {
    if (shouldRedirect) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [shouldRedirect, router, pathname]);

  if (me.isError)
    return (
      <ErrorState
        title="Could not verify your session"
        message={me.error.message}
        onRetry={() => void me.refetch()}
      />
    );
  if (me.isLoading || shouldRedirect || !me.data) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (roles && !roles.includes(me.data.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        description={`This area is only available to ${roles.map((r) => r.toLowerCase()).join(' and ')} accounts. You are signed in as ${me.data.role.toLowerCase()}.`}
        action={
          <LinkButton variant="outline" href="/">
            Back to sportsbook
          </LinkButton>
        }
      />
    );
  }
  return <>{children(me.data)}</>;
}

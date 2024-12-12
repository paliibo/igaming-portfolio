'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '@igaming/ui';
import { EventsBrowser } from '@/components/sportsbook/events-browser';
import { useSports } from '@/lib/sportsbook';
import { LinkButton } from '@/components/ui/link-button';

export default function SportPage() {
  const { slug } = useParams<{ slug: string }>();
  const sports = useSports();

  if (sports.isLoading) return <Skeleton className="h-64 w-full" />;
  if (sports.isError)
    return (
      <ErrorState
        title="Could not load sports"
        message={sports.error.message}
        onRetry={() => void sports.refetch()}
      />
    );
  const sport = sports.data?.find((s) => s.slug === slug);
  if (!sport) {
    return (
      <EmptyState
        icon={SearchX}
        title="Unknown sport"
        description={`There is no sport with the slug “${slug}”.`}
        action={
          <LinkButton variant="outline" href="/sports">
            Browse all sports
          </LinkButton>
        }
      />
    );
  }

  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <EventsBrowser
        sport={sport}
        title={sport.name}
        description={`${sport.eventCount} event${sport.eventCount === 1 ? '' : 's'} with open markets.`}
      />
    </React.Suspense>
  );
}

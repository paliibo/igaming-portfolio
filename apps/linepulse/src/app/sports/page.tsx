'use client';
import * as React from 'react';
import { Skeleton } from '@igaming/ui';
import { EventsBrowser } from '@/components/sportsbook/events-browser';

export default function SportsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <EventsBrowser
        title="All sports"
        description="Every fixture across the book with the main market inline. Tap odds to build your slip."
      />
    </React.Suspense>
  );
}

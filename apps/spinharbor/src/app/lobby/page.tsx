import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Lobby } from '@/components/games/lobby';
import { PageSkeleton } from '@/components/shell/require-auth';

export const metadata: Metadata = { title: 'Lobby' };

export default function LobbyPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lobby />
    </Suspense>
  );
}

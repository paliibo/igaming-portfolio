'use client';
import { PageHeader } from '@igaming/ui';
import { RequireAuth } from '@/components/auth/require-auth';
import { BetsList } from '@/components/bets/bets-list';
import { BetsTabs } from '@/components/bets/bets-tabs';

export default function MyBetsPage() {
  return (
    <RequireAuth>
      {() => (
        <div className="mx-auto max-w-3xl space-y-4">
          <PageHeader
            title="My bets"
            description="Open bets settle automatically when the event finishes."
            actions={<BetsTabs />}
          />
          <BetsList status="open" />
        </div>
      )}
    </RequireAuth>
  );
}

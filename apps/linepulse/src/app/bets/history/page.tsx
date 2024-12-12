'use client';
import { PageHeader } from '@igaming/ui';
import { RequireAuth } from '@/components/auth/require-auth';
import { BetsList } from '@/components/bets/bets-list';
import { BetsTabs } from '@/components/bets/bets-tabs';

export default function BetHistoryPage() {
  return (
    <RequireAuth>
      {() => (
        <div className="mx-auto max-w-3xl space-y-4">
          <PageHeader
            title="Bet history"
            description="Won, lost, void and cancelled bets with the final payout."
            actions={<BetsTabs />}
          />
          <BetsList status="settled" />
        </div>
      )}
    </RequireAuth>
  );
}

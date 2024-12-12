'use client';
import { PageHeader } from '@igaming/ui';
import { RequireAuth } from '@/components/auth/require-auth';
import { ProfileCard } from '@/components/account/profile-card';
import { TransactionsTable } from '@/components/account/transactions-table';
import { WalletCard } from '@/components/account/wallet-card';

export default function AccountPage() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="mx-auto max-w-5xl space-y-4">
          <PageHeader
            title="Account"
            description="Your profile, demo wallet and transaction history."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileCard user={user} />
            {user.role === 'PLAYER' ? <WalletCard /> : null}
          </div>
          {user.role === 'PLAYER' ? <TransactionsTable /> : null}
        </div>
      )}
    </RequireAuth>
  );
}

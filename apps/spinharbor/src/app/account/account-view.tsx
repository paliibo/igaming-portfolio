'use client';
import { BookOpenCheck, Wallet } from 'lucide-react';
import type { UserDto } from '@igaming/contracts';
import { useMe, useWallet } from '@igaming/api-client';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  PageHeader,
  Separator,
  Skeleton,
  StatCard,
} from '@igaming/ui';
import { formatCredits, formatDate, formatDateTime } from '@/lib/format';
import { RequireAuth } from '@/components/shell/require-auth';
import { TopUpForm } from '@/components/wallet/topup-form';
import { TransactionsTable } from '@/components/wallet/transactions-table';

function ProfileCard({ user }: { user: UserDto }) {
  const profile = user.profile;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Member since {formatDate(user.createdAt)}.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Display name</dt>
            <dd className="font-medium">{user.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Role</dt>
            <dd>
              <Badge variant={user.role === 'PLAYER' ? 'muted' : 'brand'}>{user.role}</Badge>
            </dd>
          </div>
          {profile ? (
            <>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Account status
                </dt>
                <dd>
                  <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {profile.status.replace('_', ' ')}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">KYC</dt>
                <dd>
                  <Badge
                    variant={
                      profile.kycStatus === 'VERIFIED'
                        ? 'success'
                        : profile.kycStatus === 'REJECTED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {profile.kycStatus}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Country</dt>
                <dd className="font-medium">{profile.country}</dd>
              </div>
              {profile.lastLoginAt ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last sign-in
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatDateTime(profile.lastLoginAt)}
                  </dd>
                </div>
              ) : null}
              {profile.selfExcludedUntil ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Self-exclusion
                  </dt>
                  <dd className="text-warning">
                    Until {formatDateTime(profile.selfExcludedUntil)}
                  </dd>
                </div>
              ) : null}
              {profile.coolingOffUntil ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cooling off
                  </dt>
                  <dd className="text-warning">Until {formatDateTime(profile.coolingOffUntil)}</dd>
                </div>
              ) : null}
              {profile.suspendedReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Suspension reason
                  </dt>
                  <dd className="text-destructive">{profile.suspendedReason}</dd>
                </div>
              ) : null}
            </>
          ) : (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Player profile
              </dt>
              <dd className="text-muted-foreground">Staff accounts have no player profile.</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function AccountBody() {
  const me = useMe();
  const wallet = useWallet();
  const user = me.data;
  if (!user) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <ProfileCard user={user} />
        <Card>
          <CardHeader>
            <CardTitle>Wallet activity</CardTitle>
            <CardDescription>
              Cursor-paginated transaction history straight from the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionsTable />
            <Separator className="my-4" />
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span>
                Operators can inspect these in LedgerArc: every transaction above corresponds to a
                balanced journal entry with debit and credit lines.
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {wallet.isError ? (
          <ErrorState
            title="Wallet unavailable"
            message={wallet.error.message}
            onRetry={() => void wallet.refetch()}
          />
        ) : wallet.data ? (
          <StatCard
            label="Balance"
            value={<span aria-live="polite">{formatCredits(wallet.data.balanceMinor)}</span>}
            hint={`Updated ${formatDateTime(wallet.data.updatedAt)} · wallet ${wallet.data.id.slice(0, 8)}`}
            icon={Wallet}
            tone="brand"
          />
        ) : (
          <Skeleton className="h-24" />
        )}
        <Card>
          <CardContent className="pt-5">
            <TopUpForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AccountView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Your profile, wallet balance and transaction history."
      />
      <RequireAuth>
        <AccountBody />
      </RequireAuth>
    </div>
  );
}

import type { KycStatus, PlayerStatus, UserDto } from '@igaming/contracts';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@igaming/ui';
import { formatDate, formatDateTime } from '@/lib/format';

const PLAYER_STATUS_VARIANT: Record<PlayerStatus, 'success' | 'destructive' | 'warning' | 'muted'> =
  {
    ACTIVE: 'success',
    SUSPENDED: 'destructive',
    COOLING_OFF: 'warning',
    SELF_EXCLUDED: 'destructive',
    CLOSED: 'muted',
  };
const KYC_VARIANT: Record<KycStatus, 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'destructive',
};

export function ProfileCard({ user }: { user: UserDto }) {
  const profile = user.profile;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Account details and verification status.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Display name</dt>
            <dd className="font-medium">{user.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd>
              <Badge variant="brand">{user.role}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Member since</dt>
            <dd className="font-medium tabular-nums">{formatDate(user.createdAt)}</dd>
          </div>
          {profile ? (
            <>
              <div>
                <dt className="text-xs text-muted-foreground">Account status</dt>
                <dd>
                  <Badge variant={PLAYER_STATUS_VARIANT[profile.status]}>
                    {profile.status.replace('_', ' ')}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">KYC</dt>
                <dd>
                  <Badge variant={KYC_VARIANT[profile.kycStatus]}>{profile.kycStatus}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Country</dt>
                <dd className="font-medium">{profile.country}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last sign-in</dt>
                <dd className="font-medium tabular-nums">
                  {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'First session'}
                </dd>
              </div>
              {profile.suspendedReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Suspension reason</dt>
                  <dd className="text-destructive">{profile.suspendedReason}</dd>
                </div>
              ) : null}
              {profile.coolingOffUntil ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Cooling off until</dt>
                  <dd className="tabular-nums">{formatDateTime(profile.coolingOffUntil)}</dd>
                </div>
              ) : null}
              {profile.selfExcludedUntil ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Self-excluded until</dt>
                  <dd className="tabular-nums">{formatDateTime(profile.selfExcludedUntil)}</dd>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Staff accounts have no player profile or wallet.
            </p>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

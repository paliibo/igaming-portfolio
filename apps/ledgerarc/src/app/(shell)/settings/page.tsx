'use client';
import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, BookOpenText, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, getApiBaseUrl } from '@igaming/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
} from '@igaming/ui';
import { useIsAdmin, useStaffUser } from '@/components/auth/require-auth';
import { useDemoReset, type DemoResetSummary } from '@/lib/api/admin';
import { formatCount, formatDateTimeFull } from '@/lib/format';
import { DetailList } from '@/components/common/metadata';
import { ShortId } from '@/components/common/short-id';

function DemoResetCard() {
  const reset = useDemoReset();
  const [open, setOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<DemoResetSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = () => {
    setError(null);
    reset.mutate(undefined, {
      onSuccess: (result) => {
        setSummary(result);
        setOpen(false);
        toast.success('Demo data reset', {
          description: `${formatCount(result.users)} users, ${formatCount(result.bets)} bets and ${formatCount(result.rounds)} rounds reseeded.`,
        });
      },
      onError: (err) => {
        setError(
          ApiError.is(err, 'DEMO_RESET_DISABLED')
            ? 'Demo reset is disabled in this environment. It only runs when the API has DEMO_RESET_ENABLED=true and is not in production.'
            : err.message,
        );
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Wipes every table and reseeds the demo players, events, games, bets and rounds.
          Development only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-muted-foreground">
            All ledger history, player accounts and audit logs are deleted and recreated. Sessions
            of other staff keep working because the demo accounts are recreated with the same
            credentials, but their ids change. The API refuses the call with{' '}
            <code className="rounded bg-muted px-1 font-mono text-xs">DEMO_RESET_DISABLED</code>{' '}
            unless it runs in development.
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {summary ? (
          <div className="rounded-md border border-success/40 bg-success/5 p-3 text-sm">
            <p className="font-medium text-success">
              Reseeded {formatDateTimeFull(summary.seededAt)}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
              {(['users', 'events', 'games', 'bets', 'rounds'] as const).map((key) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium tabular-nums">{formatCount(summary[key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            <RotateCcw aria-hidden />
            Reset demo data
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset all demo data?</DialogTitle>
              <DialogDescription>
                This deletes every player, wallet, journal entry, bet, round, alert and audit
                record, then reseeds the demo dataset. It cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={reset.isPending}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={run} loading={reset.isPending}>
                Yes, reset everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useStaffUser();
  const isAdmin = useIsAdmin();
  const docsUrl = `${getApiBaseUrl()}/api/docs`;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Environment tools and your signed-in identity." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signed in as</CardTitle>
            <CardDescription>Your staff identity, as reported by the API session.</CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: 'Name', value: user.displayName },
                { label: 'Email', value: user.email },
                {
                  label: 'Role',
                  value: (
                    <Badge variant={user.role === 'ADMIN' ? 'brand' : 'secondary'}>
                      {user.role}
                    </Badge>
                  ),
                },
                {
                  label: 'User id',
                  value: <ShortId value={user.id} length={36} label="user id" className="-ml-1" />,
                },
                { label: 'Account created', value: formatDateTimeFull(user.createdAt) },
              ]}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              Administrators can additionally post balance adjustments, reverse journal entries and
              reset demo data. Operators see those controls disabled or hidden.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API reference</CardTitle>
            <CardDescription>
              Interactive Swagger documentation for every endpoint LedgerArc uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailList
              items={[
                {
                  label: 'Base URL',
                  value: <span className="font-mono text-xs">{getApiBaseUrl()}/api</span>,
                },
                { label: 'Auth', value: 'HttpOnly session cookie shared by all apps' },
              ]}
            />
            <Button asChild variant="outline">
              <a href={docsUrl} target="_blank" rel="noreferrer">
                <BookOpenText aria-hidden />
                Open Swagger UI
                <ExternalLink aria-hidden />
              </a>
            </Button>
          </CardContent>
        </Card>

        {isAdmin ? (
          <DemoResetCard />
        ) : (
          <EmptyState
            className="xl:col-span-2"
            title="Administrator tools hidden"
            description="Demo data reset is available to ADMIN accounts only. Sign in as admin@demo.local to use it."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Switch account</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

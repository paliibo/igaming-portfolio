'use client';
import * as React from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SportsEventDto } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Skeleton,
} from '@igaming/ui';
import { EventStatusBadge } from '@/components/sportsbook/event-status';
import { describeError } from '@/lib/errors';
import { formatCredits, formatDateTime } from '@/lib/format';
import { useCancelEvent } from '@/lib/operator';
import { useEvent } from '@/lib/sportsbook';
import { ConfirmDialog } from './confirm-dialog';
import { EventStateForm } from './event-state-form';
import { MarketControls } from './market-controls';
import { SettleDialog } from './settle-dialog';

interface ManageEventDialogProps {
  event: SportsEventDto | null;
  onClose: () => void;
}

export function ManageEventDialog({ event, onClose }: ManageEventDialogProps) {
  return (
    <Dialog open={event !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto scrollbar-thin">
        {event ? <ManageEventBody listEvent={event} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ManageEventBody({
  listEvent,
  onClose,
}: {
  listEvent: SportsEventDto;
  onClose: () => void;
}) {
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [settleJobId, setSettleJobId] = React.useState<string | null>(null);
  const cancel = useCancelEvent();

  const detail = useEvent(listEvent.id, { refetchInterval: settleJobId ? 2000 : false });
  const event = detail.data ?? listEvent;
  const settling = settleJobId !== null && event.status !== 'SETTLED';
  const previousStatus = React.useRef(event.status);

  React.useEffect(() => {
    if (previousStatus.current !== 'SETTLED' && event.status === 'SETTLED' && settleJobId) {
      toast.success('Event settled', {
        description: 'All open bets have been paid out or marked lost.',
      });
    }
    previousStatus.current = event.status;
  }, [event.status, settleJobId]);

  const onCancel = () => {
    cancel.mutate(event.id, {
      onSuccess: (summary) => {
        toast.success('Event cancelled', {
          description: `${summary.betsVoid} bet${summary.betsVoid === 1 ? '' : 's'} refunded (${formatCredits(summary.paidOutMinor)})`,
        });
        setCancelOpen(false);
      },
      onError: (error) => toast.error(describeError(error, 'Could not cancel the event')),
    });
  };

  const canSettle =
    event.status === 'LIVE' || event.status === 'FINISHED' || event.status === 'SCHEDULED';
  const canCancel = event.status !== 'SETTLED' && event.status !== 'CANCELLED';

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>
            {event.homeTeam} vs {event.awayTeam}
          </DialogTitle>
          <EventStatusBadge status={event.status} />
          {settling ? (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Settling…
            </span>
          ) : null}
          {event.status === 'SETTLED' && settleJobId ? (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Settled
            </span>
          ) : null}
        </div>
        <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            {event.sport.name} · {event.competition}
          </span>
          <span className="tabular-nums">Starts {formatDateTime(event.startsAt)}</span>
          <span className="tabular-nums">
            {event.homeScore}:{event.awayScore}
          </span>
          {typeof listEvent.betCount === 'number' ? <span>{listEvent.betCount} bets</span> : null}
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1 text-brand hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Public page <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </DialogDescription>
      </DialogHeader>

      {detail.isError && !detail.data ? (
        <ErrorState
          title="Could not load event detail"
          message={detail.error.message}
          onRetry={() => void detail.refetch()}
        />
      ) : null}

      <EventStateForm
        key={`${event.id}-${event.status}-${event.homeScore}-${event.awayScore}-${event.clockMinute}-${event.periodLabel ?? ''}`}
        event={event}
      />

      <section className="space-y-2" aria-label="Markets">
        <h4 className="text-sm font-semibold">Markets</h4>
        {detail.isLoading && !detail.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-2">
            {event.markets.map((market) => (
              <MarketControls key={market.id} event={event} market={market} />
            ))}
          </div>
        )}
      </section>

      <section
        className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Settlement"
      >
        <div>
          <h4 className="text-sm font-semibold">Settlement</h4>
          <p className="text-xs text-muted-foreground">
            Settling pays out bets using the final score; cancelling voids every open bet and
            refunds the stake.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => setCancelOpen(true)}
            disabled={!canCancel || settling}
          >
            <Ban aria-hidden /> Cancel event
          </Button>
          <Button
            variant="success"
            onClick={() => setSettleOpen(true)}
            disabled={!canSettle || settling}
          >
            Settle
          </Button>
        </div>
      </section>

      <SettleDialog
        event={event}
        open={settleOpen}
        onOpenChange={setSettleOpen}
        onQueued={setSettleJobId}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this event?"
        description={`${event.homeTeam} vs ${event.awayTeam} will be marked cancelled and every open bet is refunded. This cannot be undone.`}
        confirmLabel="Cancel event and refund bets"
        destructive
        pending={cancel.isPending}
        onConfirm={onCancel}
      />
    </>
  );
}

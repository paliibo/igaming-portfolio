'use client';
import type { GameRoundDto } from '@igaming/contracts';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  Skeleton,
} from '@igaming/ui';
import {
  formatCredits,
  formatDateTime,
  formatMultiplier,
  formatMultiplierMilli,
} from '@/lib/format';
import { SymbolGlyph } from '@/components/games/symbol-glyph';
import { NetAmount } from './round-summary';

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-xs' : 'text-sm font-medium tabular-nums'}>
        {children}
      </dd>
    </div>
  );
}

function OutcomeFields({ round }: { round: GameRoundDto }) {
  const { outcome } = round;
  if (outcome.type === 'dice') {
    return (
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Roll">{outcome.roll.toFixed(2)}</Field>
        <Field label="Bet">
          <span className="capitalize">{outcome.direction}</span> {outcome.target}
        </Field>
        <Field label="Multiplier">{formatMultiplierMilli(outcome.multiplierMilli)}</Field>
        <Field label="Result">
          {outcome.win ? <Badge variant="success">Win</Badge> : <Badge variant="muted">Loss</Badge>}
        </Field>
      </dl>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Reels">
        <span className="flex gap-1">
          {outcome.reels.map((symbol, idx) => (
            <SymbolGlyph key={idx} symbol={symbol} className="h-7 w-7" title={symbol} />
          ))}
        </span>
      </Field>
      <Field label="Line">{outcome.lineLabel ?? 'No winning line'}</Field>
      <Field label="Multiplier">{formatMultiplier(outcome.multiplier)}</Field>
      <Field label="Result">
        {outcome.win ? <Badge variant="success">Win</Badge> : <Badge variant="muted">Loss</Badge>}
      </Field>
    </dl>
  );
}

export function RoundDetailsBody({ round }: { round: GameRoundDto }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Stake">{formatCredits(round.stakeMinor)}</Field>
        <Field label="Payout">{formatCredits(round.payoutMinor)}</Field>
        <Field label="Net">
          <NetAmount netMinor={round.netMinor} />
        </Field>
        <Field label="Status">
          {round.status === 'COMPLETED' ? (
            <Badge variant="success">Completed</Badge>
          ) : (
            <Badge variant="destructive">Failed</Badge>
          )}
        </Field>
      </dl>
      <Separator />
      <OutcomeFields round={round} />
      <Separator />
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Round id" mono>
          {round.id}
        </Field>
        <Field label="Session id" mono>
          {round.sessionId}
        </Field>
        <Field label="Stake ledger entry" mono>
          {round.stakeEntryId ?? '—'}
        </Field>
        <Field label="Payout ledger entry" mono>
          {round.payoutEntryId ?? '— (no payout)'}
        </Field>
      </dl>
      <details className="rounded-md border border-border bg-muted/50">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Raw outcome JSON</summary>
        <pre className="overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify({ input: round.input, outcome: round.outcome }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function RoundDetailsDialog({
  round,
  open,
  onOpenChange,
  loading = false,
}: {
  round: GameRoundDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {round ? `${round.gameName} · round #${round.roundNumber}` : 'Round details'}
          </DialogTitle>
          <DialogDescription>
            {round
              ? `Played ${formatDateTime(round.createdAt)}. Ledger entry ids can be looked up in LedgerArc.`
              : 'Loading the round from the API.'}
          </DialogDescription>
        </DialogHeader>
        {round ? (
          <RoundDetailsBody round={round} />
        ) : loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

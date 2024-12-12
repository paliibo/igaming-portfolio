'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, Receipt, Trash2, X } from 'lucide-react';
import { useMe } from '@igaming/api-client';
import { Button, Input, Label, cn } from '@igaming/ui';
import { useBetslipStore, type BetslipSelection } from '@/lib/betslip-store';
import { formatCredits } from '@/lib/format';
import {
  combinedPriceMilli,
  formatPriceMilli,
  potentialReturnMinor,
  validateStake,
} from '@/lib/odds';
import { BetConfirmation } from './bet-confirmation';
import { usePlaceBets } from './use-place-bets';
import { LinkButton } from '@/components/ui/link-button';

const QUICK_STAKES = ['10', '50', '100', '500'];

export function Betslip({ className, onClose }: { className?: string; onClose?: () => void }) {
  const me = useMe();
  const pathname = usePathname();
  const {
    selections,
    stake,
    mode,
    priceChanges,
    placed,
    hydrated,
    setStake,
    setMode,
    remove,
    clear,
    acceptCurrentPrices,
    dismissPlaced,
  } = useBetslipStore();
  const { place, pending, error, clearError } = usePlaceBets();
  const stakeId = React.useId();

  const signedIn = Boolean(me.data);
  const distinctEvents = new Set(selections.map((s) => s.eventId)).size;
  const accumulatorAllowed = selections.length > 1 && distinctEvents === selections.length;
  const effectiveMode = accumulatorAllowed && mode === 'accumulator' ? 'accumulator' : 'single';
  const stakeCheck = validateStake(stake);
  const oddsPending =
    selections.some((s) => s.priceMilli !== s.acceptedPriceMilli) || priceChanges.length > 0;
  const canPlace = signedIn && stakeCheck.ok && selections.length > 0 && !oddsPending && !pending;

  const totalStakeMinor = stakeCheck.ok
    ? BigInt(stakeCheck.minor) * BigInt(effectiveMode === 'accumulator' ? 1 : selections.length)
    : 0n;
  const accPrice = combinedPriceMilli(selections.map((s) => s.priceMilli));
  const estimatedReturn = stakeCheck.ok
    ? effectiveMode === 'accumulator'
      ? potentialReturnMinor(stakeCheck.minor, accPrice)
      : selections.reduce(
          (sum, s) => sum + potentialReturnMinor(stakeCheck.minor, s.priceMilli),
          0n,
        )
    : null;

  const onPlace = async () => {
    if (!stakeCheck.ok) return;
    await place(stakeCheck.minor);
  };

  const onAcceptOdds = async () => {
    const hadServerChanges = priceChanges.length > 0;
    acceptCurrentPrices();
    clearError();
    if (hadServerChanges && stakeCheck.ok && signedIn) await place(stakeCheck.minor, true);
  };

  return (
    <section
      aria-label="Betslip"
      className={cn('flex flex-col rounded-lg border border-border bg-card', className)}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Receipt className="h-4 w-4 text-brand" aria-hidden />
          Betslip
          {selections.length > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
              {selections.length}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-1">
          {selections.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={clear}
            >
              Clear all
            </Button>
          ) : null}
          {onClose ? (
            <Button variant="ghost" size="icon-sm" aria-label="Close betslip" onClick={onClose}>
              <X />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        {placed.length > 0 ? <BetConfirmation placed={placed} onDismiss={dismissPlaced} /> : null}

        {hydrated && selections.length === 0 && placed.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-8 text-center">
            <p className="text-sm font-medium">Your betslip is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap any odds to add a selection. Combine picks from different events into an
              accumulator.
            </p>
          </div>
        ) : null}

        {selections.length > 1 ? (
          <div
            role="radiogroup"
            aria-label="Bet type"
            className="grid grid-cols-2 rounded-md bg-muted p-0.5 text-xs font-medium"
          >
            <ModeButton
              active={effectiveMode === 'single'}
              onClick={() => setMode('single')}
              label={`Singles ×${selections.length}`}
            />
            <ModeButton
              active={effectiveMode === 'accumulator'}
              onClick={() => setMode('accumulator')}
              label={`${selections.length}-fold acca`}
              disabled={!accumulatorAllowed}
            />
          </div>
        ) : null}
        {selections.length > 1 && !accumulatorAllowed ? (
          <p className="text-[11px] text-muted-foreground">
            Accumulators need selections from different events, so these are placed as singles.
          </p>
        ) : null}

        {selections.length > 0 ? (
          <ul className="space-y-2">
            {selections.map((s) => (
              <SelectionRow
                key={s.selectionId}
                selection={s}
                onRemove={() => remove(s.selectionId)}
              />
            ))}
          </ul>
        ) : null}

        {priceChanges.length > 0 ? (
          <div
            role="alert"
            className="rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs"
          >
            <p className="flex items-center gap-1.5 font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Odds changed
            </p>
            <ul className="mt-1.5 space-y-1">
              {priceChanges.map((c) => (
                <li key={c.selectionId} className="flex justify-between gap-2 tabular-nums">
                  <span className="truncate">{c.selectionName}</span>
                  <span>
                    <span className="text-muted-foreground line-through">
                      {formatPriceMilli(c.submittedPriceMilli)}
                    </span>{' '}
                    → <span className="font-semibold">{formatPriceMilli(c.currentPriceMilli)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {selections.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={stakeId}>
                {effectiveMode === 'accumulator'
                  ? 'Stake'
                  : selections.length > 1
                    ? 'Stake per single'
                    : 'Stake'}
              </Label>
              <span className="text-[11px] text-muted-foreground">1.00 – 5,000.00 DMO</span>
            </div>
            <div className="relative">
              <Input
                id={stakeId}
                data-testid="betslip-stake"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                aria-invalid={!stakeCheck.ok && stakeCheck.message ? true : undefined}
                aria-describedby={`${stakeId}-hint`}
                className="pr-14 text-right tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                DMO
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_STAKES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setStake(q)}
                  className={cn(
                    'h-7 rounded-md border border-border text-xs font-medium tabular-nums transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                    stake === q && 'border-brand bg-brand-soft text-brand',
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            <p
              id={`${stakeId}-hint`}
              className={cn(
                'min-h-4 text-[11px]',
                !stakeCheck.ok && stakeCheck.message ? 'text-destructive' : 'text-muted-foreground',
              )}
              aria-live="polite"
            >
              {!stakeCheck.ok && stakeCheck.message
                ? stakeCheck.message
                : effectiveMode === 'single' && selections.length > 1
                  ? `${selections.length} singles · total ${formatCredits(totalStakeMinor)}`
                  : ''}
            </p>

            <dl className="space-y-1 rounded-md bg-surface px-3 py-2 text-xs tabular-nums">
              {effectiveMode === 'accumulator' ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Combined odds</dt>
                  <dd className="font-semibold">{formatPriceMilli(accPrice)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total stake</dt>
                <dd className="font-medium">
                  {stakeCheck.ok ? formatCredits(totalStakeMinor) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated return</dt>
                <dd className="font-semibold text-success">
                  {estimatedReturn !== null ? formatCredits(estimatedReturn) : '—'}
                </dd>
              </div>
            </dl>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Returns are estimated client side; the server confirms odds and payout when the bet is
              accepted.
            </p>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}

            {oddsPending ? (
              <Button
                data-testid="betslip-accept-odds"
                variant="success"
                className="w-full"
                onClick={() => void onAcceptOdds()}
                loading={pending}
              >
                Accept new odds
              </Button>
            ) : null}
            {!signedIn && me.isSuccess ? (
              <LinkButton
                variant="outline"
                className="w-full"
                href={`/login?next=${encodeURIComponent(pathname)}`}
              >
                Sign in to bet
              </LinkButton>
            ) : null}
            <Button
              data-testid="betslip-place"
              className="w-full"
              disabled={!canPlace}
              loading={pending}
              onClick={() => void onPlace()}
            >
              {effectiveMode === 'accumulator'
                ? 'Place accumulator'
                : selections.length > 1
                  ? `Place ${selections.length} singles`
                  : 'Place bet'}
              {stakeCheck.ok ? (
                <span className="font-normal opacity-80">· {formatCredits(totalStakeMinor)}</span>
              ) : null}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-7 rounded transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function SelectionRow({
  selection,
  onRemove,
}: {
  selection: BetslipSelection;
  onRemove: () => void;
}) {
  const changed = selection.priceMilli !== selection.acceptedPriceMilli;
  const up = selection.priceMilli > selection.acceptedPriceMilli;
  return (
    <li
      className={cn(
        'relative rounded-md border border-border bg-surface-raised p-2.5 pr-9 text-xs',
        changed && 'border-warning/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{selection.selectionName}</p>
          <p className="truncate text-muted-foreground">{selection.marketName}</p>
          <p className="truncate text-muted-foreground">{selection.eventName}</p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="text-sm font-semibold">{formatPriceMilli(selection.priceMilli)}</p>
          {changed ? (
            <p
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px]',
                up ? 'text-success' : 'text-destructive',
              )}
            >
              {up ? (
                <ArrowUp className="h-3 w-3" aria-hidden />
              ) : (
                <ArrowDown className="h-3 w-3" aria-hidden />
              )}
              was {formatPriceMilli(selection.acceptedPriceMilli)}
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${selection.selectionName}`}
        className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );
}

'use client';
import * as React from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import type { MarketDto, SelectionDto, SportsEventDto } from '@igaming/contracts';
import { Button, Input, cn } from '@igaming/ui';
import { MarketStatusBadge } from '@/components/sportsbook/event-status';
import { describeError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { parsePriceInput } from '@/lib/odds';
import { useUpdateMarketStatus, useUpdateSelectionPrice } from '@/lib/operator';

const MARKET_ACTIONS: { status: 'OPEN' | 'SUSPENDED' | 'CLOSED'; label: string }[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'SUSPENDED', label: 'Suspend' },
  { status: 'CLOSED', label: 'Close' },
];

export function MarketControls({ event, market }: { event: SportsEventDto; market: MarketDto }) {
  const updateStatus = useUpdateMarketStatus();
  const locked =
    market.status === 'SETTLED' || event.status === 'SETTLED' || event.status === 'CANCELLED';
  const title = market.line ? `${market.name} ${market.line}` : market.name;

  const setStatus = (status: 'OPEN' | 'SUSPENDED' | 'CLOSED') => {
    updateStatus.mutate(
      { id: market.id, status },
      {
        onSuccess: () => toast.success(`${title} is now ${status.toLowerCase()}`),
        onError: (error) => toast.error(describeError(error, 'Could not update the market')),
      },
    );
  };

  return (
    <section className="rounded-md border border-border bg-surface p-3" aria-label={title}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{title}</h4>
          <MarketStatusBadge status={market.status} />
        </div>
        {!locked ? (
          <div className="flex gap-1" role="group" aria-label={`${title} status`}>
            {MARKET_ACTIONS.map((action) => (
              <Button
                key={action.status}
                size="sm"
                variant={market.status === action.status ? 'secondary' : 'outline'}
                disabled={market.status === action.status || updateStatus.isPending}
                onClick={() => setStatus(action.status)}
                aria-pressed={market.status === action.status}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </header>
      <ul className="mt-2 divide-y divide-border">
        {market.selections.map((selection) => (
          <SelectionPriceRow key={selection.id} selection={selection} locked={locked} />
        ))}
      </ul>
    </section>
  );
}

function SelectionPriceRow({ selection, locked }: { selection: SelectionDto; locked: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState('');
  const updatePrice = useUpdateSelectionPrice();
  const parsed = parsePriceInput(value);
  const inputId = `price-${selection.id}`;

  const startEditing = () => {
    setValue(formatPrice(selection.priceMilli));
    setEditing(true);
  };

  const save = () => {
    if (parsed === null) return;
    updatePrice.mutate(
      { id: selection.id, priceMilli: parsed },
      {
        onSuccess: () => {
          toast.success(`${selection.name} priced at ${formatPrice(parsed)}`);
          setEditing(false);
        },
        onError: (error) => toast.error(describeError(error, 'Could not update the price')),
      },
    );
  };

  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate">
        {selection.name}
        {selection.result ? (
          <span
            className={cn(
              'ml-2 text-xs font-semibold',
              selection.result === 'WON'
                ? 'text-success'
                : selection.result === 'LOST'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
            )}
          >
            {selection.result}
          </span>
        ) : null}
      </span>
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            New price for {selection.name}
          </label>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            autoFocus
            aria-invalid={parsed === null}
            className="h-8 w-24 text-right tabular-nums"
          />
          <Button
            type="submit"
            size="icon-sm"
            variant="success"
            aria-label="Save price"
            disabled={parsed === null}
            loading={updatePrice.isPending}
          >
            <Check />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel editing"
            onClick={() => setEditing(false)}
          >
            <X />
          </Button>
        </form>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="w-14 text-right font-semibold tabular-nums">
            {formatPrice(selection.priceMilli)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            v{selection.priceVersion}
          </span>
          {!locked ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Edit price for ${selection.name}`}
              onClick={startEditing}
            >
              <Pencil />
            </Button>
          ) : null}
        </span>
      )}
    </li>
  );
}

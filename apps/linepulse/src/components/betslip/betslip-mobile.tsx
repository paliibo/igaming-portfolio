'use client';
import * as React from 'react';
import { ChevronUp, Receipt } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@igaming/ui';
import { useBetslipStore } from '@/lib/betslip-store';
import { combinedPriceMilli, formatPriceMilli } from '@/lib/odds';
import { Betslip } from './betslip';

export function BetslipMobileBar() {
  const [open, setOpen] = React.useState(false);
  const selections = useBetslipStore((s) => s.selections);
  const placedCount = useBetslipStore((s) => s.placed.length);
  const count = selections.length;
  if (count === 0 && placedCount === 0) return null;
  const odds =
    count > 0 ? formatPriceMilli(combinedPriceMilli(selections.map((s) => s.priceMilli))) : null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-2 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-between rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={count > 0 ? `Open betslip with ${count} selections` : 'Open betslip'}
        >
          <span className="inline-flex items-center gap-2">
            <Receipt className="h-4 w-4" aria-hidden />
            Betslip
            {count > 0 ? (
              <span className="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-2 tabular-nums">
            {odds && count > 1 ? <span className="text-xs opacity-80">Combined {odds}</span> : null}
            {placedCount > 0 && count === 0 ? (
              <span className="text-xs opacity-80">Bet placed</span>
            ) : null}
            <ChevronUp className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetTitle className="sr-only">Betslip</SheetTitle>
          <Betslip className="max-h-[85vh] rounded-none border-0" onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

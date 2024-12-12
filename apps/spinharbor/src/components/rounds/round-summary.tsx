import type { GameRoundDto } from '@igaming/contracts';
import { cn } from '@igaming/ui';
import { formatCredits, formatMultiplier, formatMultiplierMilli } from '@/lib/format';
import { SymbolGlyph } from '@/components/games/symbol-glyph';

export function RoundOutcomeSummary({
  round,
  className,
}: {
  round: GameRoundDto;
  className?: string;
}) {
  const { outcome } = round;
  if (outcome.type === 'dice') {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-x-1.5 text-sm', className)}>
        <span className="capitalize">{outcome.direction}</span>
        <span className="tabular-nums">{outcome.target}</span>
        <span className="text-muted-foreground">· rolled</span>
        <span className="font-medium tabular-nums">{outcome.roll.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          ({formatMultiplierMilli(outcome.multiplierMilli)})
        </span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className="flex gap-0.5" aria-label={outcome.reels.join(', ')}>
        {outcome.reels.map((symbol, idx) => (
          <SymbolGlyph key={idx} symbol={symbol} className="h-5 w-5" />
        ))}
      </span>
      <span className={outcome.win ? 'font-medium' : 'text-muted-foreground'}>
        {outcome.lineLabel ?? 'No line'}
      </span>
      {outcome.win ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          ({formatMultiplier(outcome.multiplier)})
        </span>
      ) : null}
    </span>
  );
}

export function netTone(netMinor: string): 'success' | 'destructive' | 'muted' {
  const net = BigInt(netMinor);
  if (net > 0n) return 'success';
  if (net < 0n) return 'destructive';
  return 'muted';
}

export function NetAmount({ netMinor, className }: { netMinor: string; className?: string }) {
  const tone = netTone(netMinor);
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        tone === 'success' && 'text-success',
        tone === 'destructive' && 'text-destructive',
        tone === 'muted' && 'text-muted-foreground',
        className,
      )}
    >
      {formatCredits(netMinor, { sign: true })}
    </span>
  );
}

import type { GameRoundDto } from '@igaming/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@igaming/ui';
import { formatCredits } from '@/lib/format';
import { NetAmount, RoundOutcomeSummary } from '@/components/rounds/round-summary';

export function SessionRounds({
  rounds,
  title = 'This session',
  description = 'Rounds played since you opened the game.',
}: {
  rounds: GameRoundDto[];
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rounds yet. Your results will be listed here as you play.
          </p>
        ) : (
          <ol
            className="divide-y divide-border text-sm"
            aria-live="polite"
            aria-relevant="additions"
          >
            {rounds.map((round) => (
              <li key={round.id} className="flex items-center gap-3 py-2">
                <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
                  #{round.roundNumber}
                </span>
                <RoundOutcomeSummary round={round} className="min-w-0 flex-1" />
                <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                  {formatCredits(round.stakeMinor)}
                </span>
                <NetAmount netMinor={round.netMinor} className="text-sm" />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

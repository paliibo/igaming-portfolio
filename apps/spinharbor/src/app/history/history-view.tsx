'use client';
import * as React from 'react';
import { Dice5 } from 'lucide-react';
import type { GameRoundDto } from '@igaming/contracts';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { useGames, useRounds } from '@/lib/casino-api';
import { formatCredits, formatDateTime } from '@/lib/format';
import { RequireAuth } from '@/components/shell/require-auth';
import { RoundDetailsDialog } from '@/components/rounds/round-details-dialog';
import { NetAmount, RoundOutcomeSummary } from '@/components/rounds/round-summary';
import { LinkButton } from '@/components/ui/link-button';

const ALL = 'ALL';

function HistoryTable() {
  const [gameSlug, setGameSlug] = React.useState<string>(ALL);
  const [selected, setSelected] = React.useState<GameRoundDto | null>(null);
  const games = useGames();
  const rounds = useRounds({ gameSlug: gameSlug === ALL ? undefined : gameSlug, limit: 25 });
  const items = rounds.data?.pages.flatMap((page) => page.items) ?? [];
  const playableGames = (games.data ?? []).filter((g) => g.playable);

  const open = (round: GameRoundDto) => setSelected(round);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" role="status">
          {rounds.data
            ? `${items.length} ${items.length === 1 ? 'round' : 'rounds'} loaded${rounds.hasNextPage ? ' · more available' : ''}`
            : 'Loading…'}
        </p>
        <div className="w-full sm:w-60">
          <Select value={gameSlug} onValueChange={setGameSlug}>
            <SelectTrigger aria-label="Filter by game">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All games</SelectItem>
              {playableGames.map((game) => (
                <SelectItem key={game.slug} value={game.slug}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rounds.isError ? (
        <ErrorState
          title="Could not load your history"
          message={rounds.error.message}
          onRetry={() => void rounds.refetch()}
        />
      ) : rounds.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Dice5}
          title="No rounds yet"
          description={
            gameSlug === ALL
              ? 'Play Harbor Dice or Harbor Reels and every round will be recorded here.'
              : 'You have not played this game yet.'
          }
          action={<LinkButton href="/play/harbor-dice">Play Harbor Dice</LinkButton>}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead className="text-right">Stake</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((round) => (
                  <TableRow
                    key={round.id}
                    data-testid="round-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${round.gameName} round ${round.roundNumber}`}
                    onClick={() => open(round)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open(round);
                      }
                    }}
                    className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(round.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{round.gameName}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        #{round.roundNumber}
                      </span>
                      {round.status === 'FAILED' ? (
                        <Badge variant="destructive" className="ml-2">
                          Failed
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCredits(round.stakeMinor)}
                    </TableCell>
                    <TableCell>
                      <RoundOutcomeSummary round={round} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCredits(round.payoutMinor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <NetAmount netMinor={round.netMinor} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rounds.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void rounds.fetchNextPage()}
                loading={rounds.isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              You have reached the start of your history.
            </p>
          )}
        </>
      )}
      <RoundDetailsDialog
        round={selected}
        open={selected !== null}
        onOpenChange={(isOpen) => (isOpen ? undefined : setSelected(null))}
      />
    </div>
  );
}

export function HistoryView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Round history"
        description="Every round you have played, newest first. Select a row for the full outcome and ledger entry ids."
      />
      <RequireAuth>
        <HistoryTable />
      </RequireAuth>
    </div>
  );
}

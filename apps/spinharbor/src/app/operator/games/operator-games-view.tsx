'use client';
import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil } from 'lucide-react';
import { GAME_STATUSES, type CasinoGameDto, type GameStatus } from '@igaming/contracts';
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { toast } from 'sonner';
import { useOperatorGames, useUpdateGame } from '@/lib/casino-api';
import { formatCredits } from '@/lib/format';
import { CATEGORY_META, STATUS_LABEL, describeError } from '@/lib/game-meta';
import { ArtworkGlyph } from '@/components/games/game-artwork';
import { RequireAuth } from '@/components/shell/require-auth';
import { StakeDialog } from './stake-dialog';

function statusVariant(status: GameStatus): 'success' | 'warning' | 'destructive' {
  return status === 'ACTIVE' ? 'success' : status === 'MAINTENANCE' ? 'warning' : 'destructive';
}

function CatalogueTable() {
  const games = useOperatorGames(true);
  const update = useUpdateGame();
  const [editing, setEditing] = React.useState<CasinoGameDto | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const patch = (
    game: CasinoGameDto,
    body: Parameters<typeof update.mutate>[0]['patch'],
    success: string,
  ) => {
    setPendingId(game.id);
    update.mutate(
      { id: game.id, patch: body },
      {
        onSuccess: () => toast.success(success),
        onError: (error) => toast.error(describeError(error)),
        onSettled: () => setPendingId(null),
      },
    );
  };

  if (games.isError)
    return (
      <ErrorState
        title="Could not load the catalogue"
        message={games.error.message}
        onRetry={() => void games.refetch()}
      />
    );
  if (games.isLoading || !games.data) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }
  if (games.data.length === 0)
    return <EmptyState title="Catalogue is empty" description="No games have been seeded." />;

  const list = games.data;
  const summary = {
    active: list.filter((g) => g.status === 'ACTIVE').length,
    maintenance: list.filter((g) => g.status === 'MAINTENANCE').length,
    disabled: list.filter((g) => g.status === 'DISABLED').length,
    featured: list.filter((g) => g.featured).length,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" role="status">
        {list.length} titles · {summary.active} active · {summary.maintenance} in maintenance ·{' '}
        {summary.disabled} disabled · {summary.featured} featured
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Stake range</TableHead>
              <TableHead className="text-right">Rounds</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((game) => {
              const busy = pendingId === game.id && update.isPending;
              return (
                <TableRow key={game.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${game.artwork.gradientFrom}, ${game.artwork.gradientTo})`,
                          color: game.artwork.accent,
                        }}
                        aria-hidden
                      >
                        <ArtworkGlyph symbol={game.artwork.symbol} className="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{game.name}</span>
                          {!game.playable ? <Badge variant="muted">Showcase</Badge> : null}
                        </div>
                        <Link
                          href={`/games/${game.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          /games/{game.slug} <ExternalLink className="h-3 w-3" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{CATEGORY_META[game.category].label}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={game.status}
                        disabled={busy}
                        onValueChange={(value) =>
                          patch(
                            game,
                            { status: value as GameStatus },
                            `${game.name} is now ${STATUS_LABEL[value as GameStatus].toLowerCase()}`,
                          )
                        }
                      >
                        <SelectTrigger className="w-40" aria-label={`Status of ${game.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GAME_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant={statusVariant(game.status)} className="hidden lg:inline-flex">
                        {STATUS_LABEL[game.status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={game.featured}
                      disabled={busy}
                      aria-label={`Feature ${game.name}`}
                      onCheckedChange={(checked) =>
                        patch(
                          game,
                          { featured: checked },
                          checked
                            ? `${game.name} is now featured`
                            : `${game.name} removed from featured`,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-sm tabular-nums">
                        {formatCredits(game.minStakeMinor)} – {formatCredits(game.maxStakeMinor)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit stake limits for ${game.name}`}
                        disabled={busy}
                        onClick={() => setEditing(game)}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(game.roundCount ?? 0).toLocaleString('en-GB')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <StakeDialog
        game={editing}
        open={editing !== null}
        onOpenChange={(open) => (open ? undefined : setEditing(null))}
      />
    </div>
  );
}

export function OperatorGamesView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue management"
        description="Toggle availability, feature titles on the home page and adjust stake limits. Changes are audited and apply immediately to players."
      />
      <RequireAuth roles={['OPERATOR', 'ADMIN']}>
        <CatalogueTable />
      </RequireAuth>
    </div>
  );
}

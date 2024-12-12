'use client';
import { Ban, Compass } from 'lucide-react';
import { ApiError } from '@igaming/api-client';
import { EmptyState, ErrorState } from '@igaming/ui';
import { useGame } from '@/lib/casino-api';
import { playabilityReason, tileState } from '@/lib/game-meta';
import { RequireAuth } from '@/components/shell/require-auth';
import { DiceGame } from '@/components/play/dice-game';
import { SlotsGame } from '@/components/play/slots-game';
import { PlayScreenSkeleton } from '@/components/play/play-frame';
import { LinkButton } from '@/components/ui/link-button';

function GameSwitch({ slug }: { slug: string }) {
  const game = useGame(slug);
  if (game.isError) {
    if (ApiError.is(game.error) && game.error.status === 404) {
      return (
        <EmptyState
          icon={Compass}
          title="Game not found"
          description={`There is no title called “${slug}” in the catalogue.`}
          action={
            <LinkButton variant="outline" href="/lobby">
              Browse the lobby
            </LinkButton>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Could not load this game"
        message={game.error.message}
        onRetry={() => void game.refetch()}
      />
    );
  }
  if (game.isLoading || !game.data) return <PlayScreenSkeleton />;
  const data = game.data;
  if (tileState(data) !== 'play') {
    return (
      <EmptyState
        icon={Ban}
        title={`${data.name} is not playable right now`}
        description={playabilityReason(data) ?? undefined}
        action={
          <div className="flex gap-2">
            <LinkButton variant="outline" href={`/games/${data.slug}`}>
              View details
            </LinkButton>
            <LinkButton href="/lobby">Back to lobby</LinkButton>
          </div>
        }
      />
    );
  }
  if (data.rules.dice) return <DiceGame game={data} />;
  if (data.rules.slots) return <SlotsGame game={data} />;
  return (
    <EmptyState
      icon={Ban}
      title="No game client for this title"
      description={`${data.name} is marked playable but SpinHarbor has no client for its engine yet.`}
      action={
        <LinkButton variant="outline" href="/lobby">
          Back to lobby
        </LinkButton>
      }
    />
  );
}

export function PlayScreen({ slug }: { slug: string }) {
  return (
    <RequireAuth>
      <GameSwitch slug={slug} />
    </RequireAuth>
  );
}

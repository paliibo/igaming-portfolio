'use client';
import { Compass, Play, Tag } from 'lucide-react';
import { ApiError, useMe } from '@igaming/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@igaming/ui';
import { useGame } from '@/lib/casino-api';
import { formatCredits } from '@/lib/format';
import { CATEGORY_META, STATUS_LABEL, playabilityReason, tileState } from '@/lib/game-meta';
import { FavoriteButton } from '@/components/games/favorite-button';
import { GameArtwork } from '@/components/games/game-artwork';
import { RulesPanel } from '@/components/games/rules-panel';
import { RecentRoundsList } from '@/components/rounds/recent-rounds';
import { LinkButton } from '@/components/ui/link-button';

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function GameDetail({ slug }: { slug: string }) {
  const me = useMe();
  const game = useGame(slug);
  const signedIn = Boolean(me.data);

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
  if (game.isLoading || !game.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const data = game.data;
  const state = tileState(data);
  const reason = playabilityReason(data);

  return (
    <div className="space-y-8">
      <GameArtwork
        artwork={data.artwork}
        className="min-h-[16rem] rounded-2xl sm:aspect-[21/9] sm:min-h-0"
        glyphClassName="left-auto right-[8%] h-[70%] translate-x-0 opacity-90 max-sm:opacity-35"
      >
        <div className="relative z-10 flex h-full flex-col justify-end gap-4 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/20 bg-white/10 text-white">
              {CATEGORY_META[data.category].label}
            </Badge>
            {data.featured ? <Badge variant="brand">Featured</Badge> : null}
            {data.status !== 'ACTIVE' ? (
              <Badge variant={data.status === 'MAINTENANCE' ? 'warning' : 'destructive'}>
                {STATUS_LABEL[data.status]}
              </Badge>
            ) : null}
            {!data.playable ? (
              <Badge className="border-transparent bg-black/40 text-white">Showcase</Badge>
            ) : null}
          </div>
          <div className="max-w-2xl text-white">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.name}</h1>
            <p className="mt-2 text-sm text-white/80 sm:text-base">{data.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state === 'play' ? (
              <LinkButton
                size="lg"
                className="bg-white text-black hover:bg-white/90"
                href={`/play/${data.slug}`}
              >
                <Play aria-hidden /> Play {data.name}
              </LinkButton>
            ) : (
              <Button
                size="lg"
                disabled
                aria-describedby="playability-reason"
                className="bg-white/80 text-black"
              >
                <Play aria-hidden />{' '}
                {state === 'maintenance'
                  ? 'Under maintenance'
                  : state === 'disabled'
                    ? 'Disabled'
                    : 'Showcase only'}
              </Button>
            )}
            <FavoriteButton
              gameId={data.id}
              gameName={data.name}
              isFavorite={Boolean(data.isFavorite)}
              showLabel
              size="default"
              className="rounded-md border-white/40 bg-black/25 text-white hover:bg-black/40 hover:text-white"
            />
          </div>
        </div>
      </GameArtwork>

      {reason ? (
        <p
          id="playability-reason"
          role="note"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          {reason}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Meta label="Provider" value={data.providerKey} />
        <Meta label="Category" value={CATEGORY_META[data.category].label} />
        <Meta label="Volatility" value={data.volatility} />
        <Meta label="RTP" value={data.theoreticalRtpLabel} />
        <Meta
          label="Stake range"
          value={`${formatCredits(data.minStakeMinor)} – ${formatCredits(data.maxStakeMinor)}`}
        />
        <Meta label="Max win" value={`${data.maxWinMultiplier.toLocaleString('en-GB')}× stake`} />
      </dl>

      {data.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {data.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="muted">
                <Tag className="h-3 w-3" aria-hidden /> {tag}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <RulesPanel rules={data.rules} />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Your recent rounds</CardTitle>
            <CardDescription>
              {signedIn
                ? `Last ${data.recentRounds.length > 0 ? data.recentRounds.length : ''} rounds you played on ${data.name}.`
                : 'Sign in to see your history on this game.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {me.isLoading ? (
              <Skeleton className="h-24" />
            ) : signedIn ? (
              <RecentRoundsList
                rounds={data.recentRounds}
                isLoading={false}
                error={null}
                onRetry={() => void game.refetch()}
                showGame={false}
                emptyDescription={
                  data.playable
                    ? `Play ${data.name} and your rounds will appear here.`
                    : 'Showcase titles cannot be played in the demo.'
                }
              />
            ) : (
              <LinkButton
                variant="outline"
                size="sm"
                href={`/login?next=${encodeURIComponent(`/games/${data.slug}`)}`}
              >
                Sign in
              </LinkButton>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

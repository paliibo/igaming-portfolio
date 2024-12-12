'use client';
import Link from 'next/link';
import { ArrowRight, LogIn, Sparkles } from 'lucide-react';
import type { GameCategory } from '@igaming/contracts';
import { useMe } from '@igaming/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState } from '@igaming/ui';
import { useGames, useRounds } from '@/lib/casino-api';
import { CATEGORY_META } from '@/lib/game-meta';
import { FeaturedBanner, FeaturedBannerSkeleton } from '@/components/games/featured-banner';
import { GameRow } from '@/components/games/game-row';
import { RecentRoundsList } from '@/components/rounds/recent-rounds';
import { LinkButton } from '@/components/ui/link-button';

function RecentPlays() {
  const rounds = useRounds({ limit: 8 });
  const items = rounds.data?.pages[0]?.items;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Recent plays</CardTitle>
          <CardDescription>Your latest rounds across all games.</CardDescription>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          History <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent>
        <RecentRoundsList
          rounds={items}
          isLoading={rounds.isLoading}
          error={rounds.error}
          onRetry={() => void rounds.refetch()}
          className="border-0 bg-transparent"
        />
      </CardContent>
    </Card>
  );
}

function SignInPanel() {
  return (
    <Card className="bg-harbor-glow">
      <CardHeader>
        <CardTitle>Play with virtual credits</CardTitle>
        <CardDescription>
          Sign in to open a game session, track every round in your history and watch the wallet
          update live. Demo accounts come pre-funded.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <LinkButton href="/login?next=%2F">
          <LogIn aria-hidden /> Sign in
        </LinkButton>
        <LinkButton variant="outline" href="/register">
          Create a demo account
        </LinkButton>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const me = useMe();
  const games = useGames();
  const signedIn = Boolean(me.data);
  const all = games.data ?? [];
  const featured = all.filter((g) => g.featured);
  const playable = all.filter((g) => g.playable && g.status === 'ACTIVE');
  const categories = (Object.keys(CATEGORY_META) as GameCategory[])
    .map((category) => ({ category, games: all.filter((g) => g.category === category) }))
    .filter((entry) => entry.games.length > 0);

  return (
    <div className="space-y-10">
      {games.isError ? (
        <ErrorState
          title="Could not load the casino"
          message={games.error.message}
          onRetry={() => void games.refetch()}
        />
      ) : games.isLoading ? (
        <FeaturedBannerSkeleton />
      ) : (
        <FeaturedBanner games={featured.length > 0 ? featured : all.slice(0, 3)} />
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-10">
          <GameRow
            id="playable"
            title="Playable now"
            description="Real engines with server-side outcomes and ledger-backed payouts."
            games={games.isLoading ? undefined : playable}
            isLoading={games.isLoading}
            href="/lobby"
            hrefLabel="Open lobby"
          />
          {games.isLoading
            ? null
            : categories.map(({ category, games: list }) => (
                <GameRow
                  key={category}
                  id={`cat-${category.toLowerCase()}`}
                  title={CATEGORY_META[category].label}
                  description={CATEGORY_META[category].blurb}
                  games={list}
                  href={`/categories/${CATEGORY_META[category].slug}`}
                />
              ))}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {me.isLoading ? null : signedIn ? <RecentPlays /> : <SignInPanel />}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" aria-hidden /> How the demo works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Harbor Dice and Harbor Reels run on real game engines: every round debits the stake
                and credits the payout atomically in a double-entry ledger.
              </p>
              <p>
                Showcase titles exist to demonstrate catalogue management (status, featured flag,
                stake limits) from the operator console.
              </p>
              <p>All amounts are DMO demo credits with no real-world value.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

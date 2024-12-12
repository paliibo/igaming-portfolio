import { ArrowRight, Play } from 'lucide-react';
import type { CasinoGameDto } from '@igaming/contracts';
import { Badge, Skeleton } from '@igaming/ui';
import { formatCredits } from '@/lib/format';
import { CATEGORY_META, tileState } from '@/lib/game-meta';
import { GameArtwork } from './game-artwork';
import { LinkButton } from '@/components/ui/link-button';

function BannerCta({ game, size }: { game: CasinoGameDto; size: 'lg' | 'sm' }) {
  const state = tileState(game);
  if (state === 'play') {
    return (
      <LinkButton
        size={size === 'lg' ? 'lg' : 'sm'}
        className="bg-white text-black hover:bg-white/90"
        href={`/play/${game.slug}`}
        aria-label={`Play ${game.name}`}
      >
        <Play aria-hidden /> Play now
      </LinkButton>
    );
  }
  return (
    <LinkButton
      size={size === 'lg' ? 'lg' : 'sm'}
      variant="outline"
      className="border-white/40 bg-black/25 text-white hover:bg-black/40 hover:text-white"
      href={`/games/${game.slug}`}
      aria-label={`View ${game.name}`}
    >
      View title <ArrowRight aria-hidden />
    </LinkButton>
  );
}

export function FeaturedBanner({ games }: { games: CasinoGameDto[] }) {
  const [hero, ...rest] = games;
  if (!hero) return null;
  const side = rest.slice(0, 2);
  return (
    <section aria-labelledby="featured-heading" className="grid gap-4 lg:grid-cols-3">
      <h2 id="featured-heading" className="sr-only">
        Featured games
      </h2>
      <GameArtwork
        artwork={hero.artwork}
        className="min-h-[18rem] rounded-2xl lg:col-span-2 lg:min-h-[22rem]"
        glyphClassName="left-auto right-[8%] top-1/2 h-[70%] translate-x-0 opacity-90 max-sm:opacity-35"
      >
        <div className="relative z-10 flex h-full flex-col justify-end gap-4 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">Featured</Badge>
            <Badge className="border-white/20 bg-white/10 text-white">
              {CATEGORY_META[hero.category].label}
            </Badge>
            {hero.status === 'MAINTENANCE' ? <Badge variant="warning">Maintenance</Badge> : null}
          </div>
          <div className="max-w-xl text-white">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">{hero.name}</h3>
            <p className="mt-2 text-sm text-white/80 sm:text-base">{hero.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <BannerCta game={hero} size="lg" />
            <span className="tabular-nums">
              From {formatCredits(hero.minStakeMinor)} · up to{' '}
              {hero.maxWinMultiplier.toLocaleString('en-GB')}×
            </span>
          </div>
        </div>
      </GameArtwork>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {side.map((game) => (
          <GameArtwork
            key={game.id}
            artwork={game.artwork}
            className="min-h-[10rem] rounded-2xl"
            glyphClassName="left-auto right-[6%] h-[60%] translate-x-0 opacity-80"
          >
            <div className="relative z-10 flex h-full flex-col justify-end gap-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">
                  {CATEGORY_META[game.category].label}
                </p>
                <h3 className="text-lg font-semibold text-white">{game.name}</h3>
              </div>
              <div>
                <BannerCta game={game} size="sm" />
              </div>
            </div>
          </GameArtwork>
        ))}
      </div>
    </section>
  );
}

export function FeaturedBannerSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-hidden>
      <Skeleton className="min-h-[18rem] rounded-2xl lg:col-span-2 lg:min-h-[22rem]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Skeleton className="min-h-[10rem] rounded-2xl" />
        <Skeleton className="min-h-[10rem] rounded-2xl" />
      </div>
    </div>
  );
}

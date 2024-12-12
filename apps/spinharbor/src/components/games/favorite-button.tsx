'use client';
import { useRouter, usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useMe } from '@igaming/api-client';
import { Button, cn } from '@igaming/ui';
import { toast } from 'sonner';
import { useToggleFavorite } from '@/lib/casino-api';
import { describeError } from '@/lib/game-meta';

export function FavoriteButton({
  gameId,
  gameName,
  isFavorite,
  className,
  size = 'icon-sm',
  showLabel = false,
}: {
  gameId: string;
  gameName: string;
  isFavorite: boolean;
  className?: string;
  size?: 'icon-sm' | 'icon' | 'default';
  showLabel?: boolean;
}) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const toggle = useToggleFavorite();
  const signedIn = Boolean(me.data);
  const label = isFavorite ? `Remove ${gameName} from favourites` : `Add ${gameName} to favourites`;

  const onClick = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    toggle.mutate(
      { gameId, isFavorite: !isFavorite },
      { onError: (error) => toast.error(describeError(error)) },
    );
  };

  return (
    <Button
      type="button"
      variant={showLabel ? 'outline' : 'ghost'}
      size={size}
      aria-label={label}
      aria-pressed={isFavorite}
      onClick={onClick}
      className={cn(
        'rounded-full',
        !showLabel && 'bg-black/35 text-white hover:bg-black/55 hover:text-white backdrop-blur-sm',
        className,
      )}
    >
      <Heart
        className={cn('transition-colors', isFavorite ? 'fill-brand text-brand' : '')}
        aria-hidden
      />
      {showLabel ? (isFavorite ? 'Favourited' : 'Add to favourites') : null}
    </Button>
  );
}

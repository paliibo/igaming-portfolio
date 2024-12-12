import Link from 'next/link';
import { cn } from '@igaming/ui';

export interface PlayerLinkProps {
  player: { id: string; email: string; displayName: string } | null | undefined;
  showEmail?: boolean;
  className?: string;
}

export function PlayerLink({ player, showEmail = true, className }: PlayerLinkProps) {
  if (!player) return <span className="text-muted-foreground">—</span>;
  return (
    <Link
      href={`/players/${player.id}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'group inline-flex min-w-0 flex-col leading-tight focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
    >
      <span className="truncate font-medium text-foreground group-hover:text-primary group-hover:underline">
        {player.displayName}
      </span>
      {showEmail ? (
        <span className="truncate text-xs text-muted-foreground">{player.email}</span>
      ) : null}
    </Link>
  );
}

import Link from 'next/link';
import type { GameCategory } from '@igaming/contracts';
import { cn } from '@igaming/ui';
import { CATEGORY_META } from '@/lib/game-meta';

interface CategoryChipsProps {
  active: GameCategory | null;
  hrefFor: (category: GameCategory | null) => string;
  counts?: Partial<Record<GameCategory, number>>;
  className?: string;
}

const chipClass = (selected: boolean) =>
  cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
    selected
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-surface-raised text-muted-foreground hover:bg-accent hover:text-foreground',
  );

export function CategoryChips({ active, hrefFor, counts, className }: CategoryChipsProps) {
  return (
    <nav
      aria-label="Categories"
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin sm:mx-0 sm:px-0',
        className,
      )}
    >
      <Link
        href={hrefFor(null)}
        className={chipClass(active === null)}
        aria-current={active === null ? 'page' : undefined}
        scroll={false}
      >
        All games
      </Link>
      {(Object.keys(CATEGORY_META) as GameCategory[]).map((category) => (
        <Link
          key={category}
          href={hrefFor(category)}
          className={chipClass(active === category)}
          aria-current={active === category ? 'page' : undefined}
          scroll={false}
        >
          {CATEGORY_META[category].label}
          {counts && counts[category] !== undefined ? (
            <span className="rounded-full bg-black/20 px-1.5 text-xs tabular-nums">
              {counts[category]}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

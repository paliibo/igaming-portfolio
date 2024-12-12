'use client';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Layers } from 'lucide-react';
import { ErrorState, Skeleton, cn } from '@igaming/ui';
import { useSports } from '@/lib/sportsbook';
import { SportIcon } from './sport-icon';

interface SportsNavProps {
  variant: 'rail' | 'chips';
  className?: string;
}

export function SportsNav({ variant, className }: SportsNavProps) {
  const sports = useSports();
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();
  const activeSlug = pathname.startsWith('/sports/') ? params.slug : undefined;
  const allActive = pathname === '/sports';

  if (sports.isError) {
    return variant === 'rail' ? (
      <ErrorState
        title="Sports unavailable"
        message={sports.error.message}
        onRetry={() => void sports.refetch()}
      />
    ) : null;
  }

  const items = sports.data ?? [];
  const totalEvents = items.reduce((sum, sport) => sum + sport.eventCount, 0);

  if (variant === 'chips') {
    return (
      <nav
        aria-label="Sports"
        className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin', className)}
      >
        {sports.isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
            ))
          : [
              <Chip
                key="all"
                href="/sports"
                active={allActive}
                label="All sports"
                count={totalEvents}
                icon={<Layers className="h-3.5 w-3.5" aria-hidden />}
              />,
              ...items.map((sport) => (
                <Chip
                  key={sport.id}
                  href={`/sports/${sport.slug}`}
                  active={activeSlug === sport.slug}
                  label={sport.name}
                  count={sport.eventCount}
                  icon={<SportIcon slug={sport.slug} className="h-3.5 w-3.5" />}
                />
              )),
            ]}
      </nav>
    );
  }

  return (
    <nav aria-label="Sports" className={cn('space-y-1', className)}>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sports
      </p>
      {sports.isLoading ? (
        Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)
      ) : (
        <>
          <RailLink
            href="/sports"
            active={allActive}
            label="All sports"
            count={totalEvents}
            icon={<Layers className="h-4 w-4" aria-hidden />}
          />
          {items.map((sport) => (
            <RailLink
              key={sport.id}
              href={`/sports/${sport.slug}`}
              active={activeSlug === sport.slug}
              label={sport.name}
              count={sport.eventCount}
              icon={<SportIcon slug={sport.slug} className="h-4 w-4" />}
            />
          ))}
        </>
      )}
    </nav>
  );
}

interface ItemProps {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon: React.ReactNode;
}

function RailLink({ href, active, label, count, icon }: ItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        active
          ? 'bg-brand-soft text-brand'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-brand' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span className="truncate font-medium">{label}</span>
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>
    </Link>
  );
}

function Chip({ href, active, label, count, icon }: ItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        active
          ? 'border-brand/50 bg-brand-soft text-brand'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </Link>
  );
}

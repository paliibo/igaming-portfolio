'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@igaming/ui';

const TABS = [
  { href: '/bets', label: 'Open' },
  { href: '/bets/history', label: 'Settled' },
];

export function BetsTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Bet status"
      className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-ring',
              active && 'bg-background text-foreground shadow-sm',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

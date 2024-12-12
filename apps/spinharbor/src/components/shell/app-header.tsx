'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useMe } from '@igaming/api-client';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  cn,
} from '@igaming/ui';
import { Logo } from './logo';
import { RealtimeIndicator } from './realtime-indicator';
import { WalletBalance } from './wallet-balance';
import { UserMenu } from './user-menu';
import { LinkButton } from '@/components/ui/link-button';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/lobby', label: 'Lobby' },
  { href: '/favorites', label: 'Favourites' },
  { href: '/history', label: 'History' },
  { href: '/account', label: 'Account' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const me = useMe();
  const user = me.data ?? null;
  const [open, setOpen] = React.useState(false);
  const links =
    user && user.role !== 'PLAYER'
      ? [...NAV, { href: '/operator/games', label: 'Operator' } as const]
      : NAV;

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
              <SheetDescription>Demo online casino. Virtual credits only.</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium hover:bg-accent',
                    isActive(pathname, item.href)
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6">
              <RealtimeIndicator />
            </div>
          </SheetContent>
        </Sheet>

        <Logo />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground',
                isActive(pathname, item.href)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <RealtimeIndicator className="hidden md:inline-flex" />
          {me.isLoading ? (
            <Skeleton className="h-9 w-36" />
          ) : user ? (
            <>
              <WalletBalance enabled />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <LinkButton
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                href="/register"
              >
                Register
              </LinkButton>
              <LinkButton size="sm" href={loginHref}>
                Sign in
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

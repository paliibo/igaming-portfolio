'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useMe } from '@igaming/api-client';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, Skeleton, cn } from '@igaming/ui';
import { BrandMark } from './brand-mark';
import { RealtimeIndicator } from './realtime-indicator';
import { UserMenu } from './user-menu';
import { WalletBalance } from './wallet-balance';
import { isNavActive, visibleLinks } from './nav-links';
import { LinkButton } from '@/components/ui/link-button';

export function Header() {
  const me = useMe();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [open, setOpen] = React.useState(false);
  const role = hydrated ? (me.data?.role ?? null) : null;
  const links = visibleLinks(role);

  const navLink = (href: string, label: string, mobile = false) => {
    const active = isNavActive(href, pathname, search);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen(false)}
        className={cn(
          'rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          mobile ? 'block px-3 py-2' : 'px-2.5 py-1.5',
          active
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>
                <BrandMark />
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
              {links.map((link) => navLink(link.href, link.label, true))}
              {hydrated && !me.data && !me.isLoading ? (
                <>
                  {navLink('/login', 'Sign in', true)}
                  {navLink('/register', 'Create account', true)}
                </>
              ) : null}
            </nav>
            <div className="mt-6 border-t border-border pt-4">
              <RealtimeIndicator />
            </div>
          </SheetContent>
        </Sheet>
        <BrandMark className="text-base" />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => navLink(link.href, link.label))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <RealtimeIndicator className="hidden sm:inline-flex" />
          <WalletBalance enabled={hydrated && me.data?.role === 'PLAYER'} />
          {!hydrated || me.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : me.data ? (
            <UserMenu user={me.data} />
          ) : (
            <div className="flex items-center gap-1.5">
              <LinkButton
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                href="/register"
              >
                Register
              </LinkButton>
              <LinkButton size="sm" href={`/login?next=${encodeURIComponent(pathname)}`}>
                Sign in
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const subscribeNoop = () => () => {};

/** False during server rendering and the first client render, so auth-dependent UI never mismatches. */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

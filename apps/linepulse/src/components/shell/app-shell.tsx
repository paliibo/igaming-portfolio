'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Betslip } from '@/components/betslip/betslip';
import { BetslipMobileBar } from '@/components/betslip/betslip-mobile';
import { SportsNav } from '@/components/sportsbook/sports-nav';
import { useBetslipStore } from '@/lib/betslip-store';
import { Header } from './header';
import { RealtimeSync } from './realtime-sync';

function isSportsbookRoute(pathname: string) {
  return pathname === '/' || pathname.startsWith('/sports') || pathname.startsWith('/events');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sportsbook = isSportsbookRoute(pathname);
  const bare = pathname === '/login' || pathname === '/register';

  React.useEffect(() => {
    void useBetslipStore.persist.rehydrate();
  }, []);

  return (
    <>
      <RealtimeSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <React.Suspense fallback={<div className="h-14 border-b border-border" />}>
        <Header />
      </React.Suspense>
      {bare ? (
        <main
          id="main"
          className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-screen-2xl items-center justify-center px-4 py-10"
        >
          {children}
        </main>
      ) : sportsbook ? (
        <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 py-4 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-8 xl:grid-cols-[208px_minmax(0,1fr)_340px]">
          <aside className="hidden xl:block">
            <div className="sticky top-[4.5rem]">
              <SportsNav variant="rail" />
            </div>
          </aside>
          <main id="main" className="min-w-0">
            <SportsNav variant="chips" className="mb-4 xl:hidden" />
            {children}
          </main>
          <aside className="hidden lg:block" aria-label="Betslip sidebar">
            <Betslip className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)]" />
          </aside>
          <BetslipMobileBar />
        </div>
      ) : (
        <main id="main" className="mx-auto w-full max-w-screen-2xl px-4 py-4 pb-12 sm:py-6">
          {children}
        </main>
      )}
    </>
  );
}

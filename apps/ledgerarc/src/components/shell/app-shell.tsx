'use client';
import * as React from 'react';
import { RequireAuth } from '@/components/auth/require-auth';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main
            id="main"
            className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6"
          >
            {children}
          </main>
          <footer className="px-4 py-3 text-center text-[11px] text-muted-foreground sm:px-6">
            LedgerArc · Demo currency (DMO) only · All balances are derived from the double-entry
            ledger
          </footer>
        </div>
      </div>
    </RequireAuth>
  );
}

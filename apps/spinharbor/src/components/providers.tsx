'use client';
import * as React from 'react';
import { ApiProvider, RealtimeProvider } from '@igaming/api-client';
import { TooltipProvider } from '@igaming/ui';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <RealtimeProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton theme="dark" />
      </RealtimeProvider>
    </ApiProvider>
  );
}

import { Suspense } from 'react';
import { AppShell } from '@/components/shell/app-shell';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

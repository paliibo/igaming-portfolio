import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/shell/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'LinePulse', template: '%s · LinePulse' },
  description: 'Real-time demo sportsbook. Virtual credits only.',
};

export const viewport: Viewport = {
  themeColor: '#0b1220',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { AppHeader } from '@/components/shell/app-header';
import { AppFooter } from '@/components/shell/app-footer';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SpinHarbor', template: '%s · SpinHarbor' },
  description: 'Demo online casino. Virtual credits only.',
};

export const viewport: Viewport = {
  themeColor: '#121016',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <Providers>
          <AppHeader />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}

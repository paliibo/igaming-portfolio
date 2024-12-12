import Link from 'next/link';
import { HarborMark } from './logo';

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <HarborMark className="h-5 w-5" />
          <span>
            SpinHarbor is a portfolio demo. All balances are virtual DMO credits with no real-world
            value.
          </span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/lobby" className="hover:text-foreground">
            Lobby
          </Link>
          <Link href="/games/harbor-dice" className="hover:text-foreground">
            Dice rules
          </Link>
          <Link href="/games/harbor-reels" className="hover:text-foreground">
            Reels paytable
          </Link>
          <Link href="/account" className="hover:text-foreground">
            Wallet
          </Link>
        </nav>
      </div>
    </footer>
  );
}

'use client';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { useLogout, useRealtime, useWallet } from '@igaming/api-client';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  cn,
} from '@igaming/ui';
import { toast } from 'sonner';
import { useStaffUser } from '@/components/auth/require-auth';
import { formatCredits } from '@/lib/format';
import { BrandMark, NavLinks } from './sidebar';
import { pageTitleFor } from './nav-items';

function RealtimeIndicator() {
  const { state } = useRealtime();
  const label =
    state === 'connected' ? 'Live' : state === 'connecting' ? 'Reconnecting…' : 'Offline';
  const dot =
    state === 'connected'
      ? 'bg-success animate-pulse-dot'
      : state === 'connecting'
        ? 'bg-warning'
        : 'bg-destructive';
  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
      role="status"
      aria-live="polite"
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}

function UserMenu() {
  const user = useStaffUser();
  const router = useRouter();
  const logout = useLogout();
  const wallet = useWallet();

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.replace('/login'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-9 gap-2 px-2"
          aria-label={`Account menu for ${user.displayName}`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden flex-col items-start leading-tight md:flex">
            <span className="text-sm font-medium">{user.displayName}</span>
            <span className="text-[11px] text-muted-foreground">{user.email}</span>
          </span>
          <Badge
            variant={user.role === 'ADMIN' ? 'brand' : 'secondary'}
            className="hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={user.role === 'ADMIN' ? 'brand' : 'secondary'}>{user.role}</Badge>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your demo wallet</span>
            <span
              data-testid="wallet-balance"
              aria-live="polite"
              className="tabular-nums font-medium"
            >
              {wallet.data
                ? formatCredits(wallet.data.balanceMinor)
                : wallet.isError
                  ? 'unavailable'
                  : '…'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'ADMIN' ? (
          <DropdownMenuItem onSelect={() => router.push('/settings')}>
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem data-testid="logout" onSelect={signOut} disabled={logout.isPending}>
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col bg-surface p-0 text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-white/10 px-4">
            <BrandMark />
          </div>
          <div className="flex flex-1 flex-col p-2 pt-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
        {pageTitleFor(pathname)}
      </h2>
      <RealtimeIndicator />
      <UserMenu />
    </header>
  );
}

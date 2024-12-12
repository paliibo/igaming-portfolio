'use client';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Receipt, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { UserDto } from '@igaming/contracts';
import { useLogout } from '@igaming/api-client';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@igaming/ui';
import { useBetslipStore } from '@/lib/betslip-store';
import { describeError } from '@/lib/errors';

const ROLE_VARIANT = { PLAYER: 'brand', OPERATOR: 'warning', ADMIN: 'destructive' } as const;

export function UserMenu({ user }: { user: UserDto }) {
  const router = useRouter();
  const logout = useLogout();
  const clearSlip = useBetslipStore((s) => s.clear);

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        clearSlip();
        router.push('/login');
      },
      onError: (error) => toast.error(describeError(error, 'Could not sign out')),
    });
  };

  const initials = user.displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2" aria-label="Open user menu">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand"
            aria-hidden
          >
            {initials}
          </span>
          <span className="hidden max-w-[120px] truncate sm:inline">{user.displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate text-sm font-medium text-foreground">{user.displayName}</span>
          <span className="truncate text-xs font-normal">{user.email}</span>
          <Badge variant={ROLE_VARIANT[user.role]} className="mt-1 w-fit">
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/account')}>
          <UserRound /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/bets')}>
          <Receipt /> My bets
        </DropdownMenuItem>
        {user.role !== 'PLAYER' ? (
          <DropdownMenuItem onSelect={() => router.push('/operator')}>
            <ShieldCheck /> Operator console
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="logout" onSelect={onLogout} disabled={logout.isPending}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

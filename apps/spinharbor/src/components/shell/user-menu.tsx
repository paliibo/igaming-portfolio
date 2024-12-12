'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Heart, History, LogOut, ShieldCheck, UserRound } from 'lucide-react';
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
import { toast } from 'sonner';
import { describeError } from '@/lib/game-meta';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenu({ user }: { user: UserDto }) {
  const router = useRouter();
  const logout = useLogout();
  const isStaff = user.role !== 'PLAYER';

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-2"
          aria-label={`Account menu for ${user.displayName}`}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary-foreground"
            aria-hidden
          >
            {initials(user.displayName) || 'P'}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm sm:inline">
            {user.displayName}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          <Badge variant={isStaff ? 'brand' : 'muted'} className="mt-1">
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound className="mr-2 h-4 w-4" aria-hidden /> Account & wallet
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favorites">
            <Heart className="mr-2 h-4 w-4" aria-hidden /> Favourites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history">
            <History className="mr-2 h-4 w-4" aria-hidden /> Round history
          </Link>
        </DropdownMenuItem>
        {isStaff ? (
          <DropdownMenuItem asChild>
            <Link href="/operator/games">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden /> Operator catalogue
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="logout" onSelect={onLogout} disabled={logout.isPending}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

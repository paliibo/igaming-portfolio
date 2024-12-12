'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Landmark } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@igaming/ui';
import { useIsAdmin } from '@/components/auth/require-auth';
import { useSidebarCollapsed } from '@/lib/sidebar-store';
import { NAV_SECTIONS, isNavActive } from './nav-items';

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md text-white focus-visible:outline-2 focus-visible:outline-white/70"
      aria-label="LedgerArc home"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <Landmark className="h-4 w-4" aria-hidden />
      </span>
      {!collapsed ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">LedgerArc</span>
          <span className="text-[11px] text-white/55">Operations back office</span>
        </span>
      ) : null}
    </Link>
  );
}

export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin"
    >
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            {!collapsed ? (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            ) : (
              <div className="mx-3 mb-2 h-px bg-white/10" aria-hidden />
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = isNavActive(item.href, pathname);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70',
                      active &&
                        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed ? (
                      <span className="truncate">{item.label}</span>
                    ) : (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const Icon = collapsed ? ChevronsRight : ChevronsLeft;

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-surface text-white transition-[width] duration-200 lg:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
      data-collapsed={collapsed}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-white/10 px-3',
          collapsed && 'justify-center',
        )}
      >
        <BrandMark collapsed={collapsed} />
      </div>
      <div className="flex flex-1 flex-col p-2 pt-4">
        <NavLinks collapsed={collapsed} />
      </div>
      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70',
            collapsed && 'justify-center px-0',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </aside>
  );
}

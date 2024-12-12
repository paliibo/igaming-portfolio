import type { Role } from '@igaming/contracts';

export interface NavLink {
  href: string;
  label: string;
  roles?: Role[];
  requiresAuth?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/sports', label: 'Sports' },
  { href: '/sports?tab=live', label: 'Live' },
  { href: '/bets', label: 'My bets', requiresAuth: true },
  { href: '/account', label: 'Account', requiresAuth: true },
  { href: '/operator', label: 'Operator', roles: ['OPERATOR', 'ADMIN'] },
];

export function isNavActive(href: string, pathname: string, search: string): boolean {
  const [path, query] = href.split('?');
  if (query) return pathname === path && search.includes(query);
  if (path === '/') return pathname === '/';
  if (path === '/sports') return pathname.startsWith('/sports') && !search.includes('tab=live');
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function visibleLinks(role: Role | null | undefined): NavLink[] {
  return NAV_LINKS.filter((link) => {
    if (link.roles) return role ? link.roles.includes(role) : false;
    if (link.requiresAuth) return Boolean(role);
    return true;
  });
}

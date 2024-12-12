import {
  BookOpen,
  Coins,
  Dice5,
  FileBarChart2,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldAlert,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Customers',
    items: [
      { href: '/players', label: 'Players', icon: Users },
      { href: '/risk', label: 'Risk alerts', icon: ShieldAlert },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/wallets', label: 'Wallet balances', icon: Wallet },
      { href: '/transactions', label: 'Transactions', icon: Coins },
      { href: '/journal', label: 'Ledger journal', icon: BookOpen },
      { href: '/reports', label: 'Reports', icon: FileBarChart2 },
    ],
  },
  {
    title: 'Activity',
    items: [
      { href: '/bets', label: 'Sports bets', icon: Trophy },
      { href: '/rounds', label: 'Casino rounds', icon: Dice5 },
      { href: '/audit', label: 'Audit logs', icon: ScrollText },
    ],
  },
  {
    title: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings, adminOnly: true }],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleFor(pathname: string): string {
  const match = ALL_NAV_ITEMS.find((item) => isNavActive(item.href, pathname));
  if (match) return match.label;
  return 'LedgerArc';
}

import Link from 'next/link';
import { cn } from '@igaming/ui';

export function HarborMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('h-7 w-7', className)}>
      <defs>
        <linearGradient id="harbor-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#harbor-mark)" />
      <path
        d="M16 8v14M11 13h10M16 22c-3.5 0-6.5-2.2-7.5-5.5M16 22c3.5 0 6.5-2.2 7.5-5.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="7" r="1.8" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-semibold tracking-tight',
        className,
      )}
      aria-label="SpinHarbor home"
    >
      <HarborMark />
      <span className="text-base">
        Spin<span className="text-brand">Harbor</span>
      </span>
    </Link>
  );
}

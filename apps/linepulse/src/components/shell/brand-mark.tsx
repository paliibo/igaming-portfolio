import Link from 'next/link';
import { cn } from '@igaming/ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      aria-label="LinePulse home"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="text-brand"
      >
        <rect x="1" y="1" width="22" height="22" rx="6" className="fill-brand-soft" />
        <path
          d="M4.5 14.5 8 10l3 5 3.5-8 2.5 5 2.5-3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        Line<span className="text-brand">Pulse</span>
      </span>
    </Link>
  );
}

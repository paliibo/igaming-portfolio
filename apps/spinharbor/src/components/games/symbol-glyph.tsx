import { cn } from '@igaming/ui';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const GLYPHS: Record<string, { color: string; draw: () => React.JSX.Element }> = {
  anchor: {
    color: '#9ca3af',
    draw: () => (
      <g {...STROKE}>
        <circle cx="16" cy="6" r="3" />
        <line x1="16" y1="9" x2="16" y2="28" />
        <line x1="10" y1="13" x2="22" y2="13" />
        <path d="M5 19c0 6 5 9 11 9s11-3 11-9" />
        <path d="M5 19l-2 3M27 19l2 3" />
      </g>
    ),
  },
  shell: {
    color: '#f9a8d4',
    draw: () => (
      <g {...STROKE}>
        <path d="M16 28C7 28 3 21 3 15a13 13 0 0 1 26 0c0 6-4 13-13 13z" />
        <path d="M16 28V7M16 28L7 11M16 28l9-17M16 28L4 17M16 28l12-11" />
      </g>
    ),
  },
  compass: {
    color: '#67e8f9',
    draw: () => (
      <g {...STROKE}>
        <circle cx="16" cy="16" r="12" />
        <path d="M21 11l-3 7-7 3 3-7z" fill="currentColor" stroke="none" />
        <circle cx="16" cy="16" r="1.5" fill="var(--background)" stroke="none" />
      </g>
    ),
  },
  lantern: {
    color: '#fbbf24',
    draw: () => (
      <g {...STROKE}>
        <path d="M11 9h10l2 4v10l-2 4H11l-2-4V13z" />
        <line x1="13" y1="6" x2="19" y2="6" />
        <line x1="16" y1="6" x2="16" y2="9" />
        <line x1="12" y1="29" x2="20" y2="29" />
        <path d="M16 14c-2 2-2 6 0 8 2-2 2-6 0-8z" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  pearl: {
    color: '#e9d5ff',
    draw: () => (
      <g {...STROKE}>
        <path d="M4 18c3 5 8 8 12 8s9-3 12-8c-3-2-8-3-12-3s-9 1-12 3z" />
        <circle cx="16" cy="13" r="5" fill="currentColor" stroke="none" />
        <circle cx="14" cy="11.5" r="1.4" fill="var(--background)" stroke="none" opacity="0.8" />
      </g>
    ),
  },
  crown: {
    color: '#d4a846',
    draw: () => (
      <g {...STROKE}>
        <path
          d="M5 23L3 9l7 5 6-8 6 8 7-5-2 14z"
          fill="color-mix(in oklab, currentColor 25%, transparent)"
        />
        <line x1="5" y1="27" x2="27" y2="27" />
        <circle cx="16" cy="18" r="1.6" fill="currentColor" stroke="none" />
      </g>
    ),
  },
  '*': {
    color: '#a399b3',
    draw: () => (
      <g {...STROKE}>
        <path d="M16 4v24M6 10l20 12M6 22l20-12" />
      </g>
    ),
  },
};

export function symbolLabel(key: string, symbols?: { key: string; label: string }[]): string {
  if (key === '*') return 'Any symbol';
  return symbols?.find((s) => s.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function SymbolGlyph({
  symbol,
  className,
  title,
}: {
  symbol: string;
  className?: string;
  title?: string;
}) {
  const entry = GLYPHS[symbol] ?? GLYPHS['*']!;
  return (
    <svg
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('h-8 w-8', className)}
      style={{ color: entry.color }}
    >
      {entry.draw()}
    </svg>
  );
}

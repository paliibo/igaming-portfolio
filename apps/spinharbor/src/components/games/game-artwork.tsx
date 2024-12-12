import type { GameArtwork as Artwork } from '@igaming/contracts';
import { cn } from '@igaming/ui';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Dice() {
  return (
    <g {...STROKE}>
      <rect x="8" y="20" width="28" height="28" rx="6" transform="rotate(-12 22 34)" />
      <rect
        x="30"
        y="14"
        width="26"
        height="26"
        rx="6"
        fill="color-mix(in oklab, currentColor 18%, transparent)"
      />
      <g fill="currentColor" stroke="none">
        <circle cx="16" cy="28" r="2.2" transform="rotate(-12 22 34)" />
        <circle cx="22" cy="34" r="2.2" transform="rotate(-12 22 34)" />
        <circle cx="28" cy="40" r="2.2" transform="rotate(-12 22 34)" />
        <circle cx="37" cy="21" r="2.2" />
        <circle cx="49" cy="21" r="2.2" />
        <circle cx="37" cy="33" r="2.2" />
        <circle cx="49" cy="33" r="2.2" />
        <circle cx="43" cy="27" r="2.2" />
      </g>
    </g>
  );
}

function Reels() {
  return (
    <g {...STROKE}>
      <rect x="8" y="14" width="48" height="36" rx="6" />
      <line x1="24" y1="14" x2="24" y2="50" />
      <line x1="40" y1="14" x2="40" y2="50" />
      <circle cx="16" cy="32" r="3.5" fill="currentColor" stroke="none" />
      <path
        d="M32 26l2.2 4.4 4.8.7-3.5 3.4.8 4.8L32 37l-4.3 2.3.8-4.8-3.5-3.4 4.8-.7z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M44 36l4-8 4 8" />
    </g>
  );
}

function Trident() {
  return (
    <g {...STROKE}>
      <line x1="32" y1="54" x2="32" y2="18" />
      <path d="M32 18c0-6 4-9 4-9M32 18c0-6-4-9-4-9" />
      <path d="M18 18c0 8 5 14 14 14s14-6 14-14" />
      <path d="M18 18l-2-6M46 18l2-6" />
      <line x1="24" y1="44" x2="40" y2="44" />
    </g>
  );
}

function Cards() {
  return (
    <g {...STROKE}>
      <rect
        x="12"
        y="16"
        width="24"
        height="34"
        rx="4"
        transform="rotate(-10 24 33)"
        fill="color-mix(in oklab, currentColor 12%, transparent)"
      />
      <rect x="28" y="14" width="24" height="34" rx="4" transform="rotate(8 40 31)" />
      <path
        d="M40 24c-2-3-6-1-6 2 0 3 6 7 6 7s6-4 6-7c0-3-4-5-6-2z"
        fill="currentColor"
        stroke="none"
        transform="rotate(8 40 31)"
      />
    </g>
  );
}

function Wheel() {
  return (
    <g {...STROKE}>
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="12" />
      <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
      <line x1="32" y1="10" x2="32" y2="20" />
      <line x1="32" y1="44" x2="32" y2="54" />
      <line x1="10" y1="32" x2="20" y2="32" />
      <line x1="44" y1="32" x2="54" y2="32" />
      <line x1="16.4" y1="16.4" x2="23.5" y2="23.5" />
      <line x1="40.5" y1="40.5" x2="47.6" y2="47.6" />
      <line x1="16.4" y1="47.6" x2="23.5" y2="40.5" />
      <line x1="40.5" y1="23.5" x2="47.6" y2="16.4" />
    </g>
  );
}

function Ladder() {
  return (
    <g {...STROKE}>
      <line x1="22" y1="54" x2="22" y2="10" />
      <line x1="42" y1="54" x2="42" y2="10" />
      <line x1="22" y1="18" x2="42" y2="18" />
      <line x1="22" y1="28" x2="42" y2="28" />
      <line x1="22" y1="38" x2="42" y2="38" />
      <line x1="22" y1="48" x2="42" y2="48" />
      <path d="M50 14l2-4 2 4-2 4z" fill="currentColor" stroke="none" />
    </g>
  );
}

function Rocket() {
  return (
    <g {...STROKE}>
      <path
        d="M32 8c8 6 10 16 10 26l-10 8-10-8c0-10 2-20 10-26z"
        fill="color-mix(in oklab, currentColor 14%, transparent)"
      />
      <circle cx="32" cy="26" r="4" />
      <path d="M22 34l-6 8 8-2M42 34l6 8-8-2" />
      <path d="M28 44c0 6 4 10 4 10s4-4 4-10" />
    </g>
  );
}

function Sparkle() {
  return (
    <g {...STROKE}>
      <path
        d="M32 10l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"
        fill="color-mix(in oklab, currentColor 18%, transparent)"
      />
      <path
        d="M48 44l1.5 4.5L54 50l-4.5 1.5L48 56l-1.5-4.5L42 50l4.5-1.5z"
        fill="currentColor"
        stroke="none"
      />
    </g>
  );
}

const SYMBOLS: Record<string, () => React.JSX.Element> = {
  dice: Dice,
  reels: Reels,
  trident: Trident,
  cards: Cards,
  wheel: Wheel,
  ladder: Ladder,
  rocket: Rocket,
};

export function ArtworkGlyph({ symbol, className }: { symbol: string; className?: string }) {
  const Glyph = SYMBOLS[symbol] ?? Sparkle;
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <Glyph />
    </svg>
  );
}

export function GameArtwork({
  artwork,
  className,
  glyphClassName,
  children,
}: {
  artwork: Artwork;
  className?: string;
  glyphClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${artwork.gradientFrom}, ${artwork.gradientTo})`,
        color: artwork.accent,
      }}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(70% 60% at 80% 10%, rgba(255,255,255,0.18), transparent 70%), radial-gradient(60% 50% at 10% 100%, rgba(0,0,0,0.35), transparent 70%)',
        }}
        aria-hidden
      />
      <ArtworkGlyph
        symbol={artwork.symbol}
        className={cn(
          'absolute left-1/2 top-1/2 h-[58%] w-auto -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]',
          glyphClassName,
        )}
      />
      {children}
    </div>
  );
}

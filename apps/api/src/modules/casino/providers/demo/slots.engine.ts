import type { SlotsOutcome, SlotsPaytableRow } from '@igaming/contracts';
import type { RandomSource } from '../random-source.js';

export const SLOT_SYMBOLS = [
  { key: 'anchor', label: 'Anchor', weight: 30 },
  { key: 'shell', label: 'Shell', weight: 26 },
  { key: 'compass', label: 'Compass', weight: 20 },
  { key: 'lantern', label: 'Lantern', weight: 13 },
  { key: 'pearl', label: 'Pearl', weight: 8 },
  { key: 'crown', label: 'Harbor Crown', weight: 3 },
] as const;

export type SlotSymbol = (typeof SLOT_SYMBOLS)[number]['key'];

/** Explicit paytable: three-of-a-kind lines plus a small consolation for a pair of crowns. */
export const SLOTS_PAYTABLE: SlotsPaytableRow[] = [
  { combination: ['crown', 'crown', 'crown'], label: 'Harbor Crown jackpot', multiplier: 100 },
  { combination: ['pearl', 'pearl', 'pearl'], label: 'Triple Pearl', multiplier: 40 },
  { combination: ['lantern', 'lantern', 'lantern'], label: 'Triple Lantern', multiplier: 15 },
  { combination: ['compass', 'compass', 'compass'], label: 'Triple Compass', multiplier: 8 },
  { combination: ['shell', 'shell', 'shell'], label: 'Triple Shell', multiplier: 4 },
  { combination: ['anchor', 'anchor', 'anchor'], label: 'Triple Anchor', multiplier: 2 },
  { combination: ['crown', 'crown', '*'], label: 'Crown pair', multiplier: 3 },
];

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((acc, s) => acc + s.weight, 0);

export function spinReel(random: RandomSource): SlotSymbol {
  let roll = random.next() * TOTAL_WEIGHT;
  for (const symbol of SLOT_SYMBOLS) {
    roll -= symbol.weight;
    if (roll < 0) return symbol.key;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1]!.key;
}

export function evaluateReels(reels: [string, string, string]): { row: SlotsPaytableRow | null } {
  for (const row of SLOTS_PAYTABLE) {
    const matches = row.combination.every((wanted, idx) => wanted === '*' || wanted === reels[idx]);
    if (matches) return { row };
  }
  const crowns = reels.filter((r) => r === 'crown').length;
  if (crowns === 2) return { row: SLOTS_PAYTABLE.find((r) => r.label === 'Crown pair') ?? null };
  return { row: null };
}

export function playSlots(
  stakeMinor: bigint,
  random: RandomSource,
): { outcome: SlotsOutcome; payoutMinor: bigint } {
  const reels: [string, string, string] = [spinReel(random), spinReel(random), spinReel(random)];
  const { row } = evaluateReels(reels);
  const multiplier = row?.multiplier ?? 0;
  return {
    outcome: {
      type: 'slots',
      reels,
      win: multiplier > 0,
      lineLabel: row?.label ?? null,
      multiplier,
    },
    payoutMinor: stakeMinor * BigInt(multiplier),
  };
}

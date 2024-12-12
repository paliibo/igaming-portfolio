import type { DiceOutcome } from '@igaming/contracts';
import type { RandomSource } from '../random-source.js';

export const DICE_HOUSE_EDGE_PERCENT = 1;
export const DICE_MIN_TARGET = 2;
export const DICE_MAX_TARGET = 98;

/**
 * Roll a number in [0, 100). "Under T" wins when roll < T with probability T %; "Over T" wins when
 * roll > T with probability (100 − T − 1 + 1) ≈ (99 − T) %. Multiplier = (100 − edge) / winChance.
 * Multipliers are kept in thousandths so payout maths stays in integers.
 */
export function diceMultiplierMilli(target: number, direction: 'under' | 'over'): number {
  const winChancePercent = direction === 'under' ? target : 99 - target;
  return Math.floor(((100 - DICE_HOUSE_EDGE_PERCENT) * 1000) / winChancePercent);
}

export function playDice(
  stakeMinor: bigint,
  target: number,
  direction: 'under' | 'over',
  random: RandomSource,
): { outcome: DiceOutcome; payoutMinor: bigint } {
  const roll = Math.floor(random.next() * 10_000) / 100; // two decimals, 0.00–99.99
  const win = direction === 'under' ? roll < target : roll > target;
  const multiplierMilli = diceMultiplierMilli(target, direction);
  const payoutMinor = win ? (stakeMinor * BigInt(multiplierMilli)) / 1000n : 0n;
  return { outcome: { type: 'dice', roll, target, direction, win, multiplierMilli }, payoutMinor };
}

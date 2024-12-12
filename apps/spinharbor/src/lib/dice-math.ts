/** Mirrors apps/api dice.engine.ts so the UI can preview chance and multiplier; the server result is authoritative. */
export const DICE_HOUSE_EDGE_PERCENT = 1;
export const DICE_MIN_TARGET = 2;
export const DICE_MAX_TARGET = 98;

export type DiceDirection = 'under' | 'over';

export function diceWinChancePercent(target: number, direction: DiceDirection): number {
  return direction === 'under' ? target : 99 - target;
}

export function diceMultiplierMilli(target: number, direction: DiceDirection): number {
  return Math.floor(
    ((100 - DICE_HOUSE_EDGE_PERCENT) * 1000) / diceWinChancePercent(target, direction),
  );
}

/** Gross payout on a win for a given stake, in minor units (integer maths only). */
export function dicePayoutMinor(stakeMinor: string, multiplierMilli: number): string {
  return ((BigInt(stakeMinor) * BigInt(multiplierMilli)) / 1000n).toString();
}

export function clampTarget(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(DICE_MAX_TARGET, Math.max(DICE_MIN_TARGET, Math.round(value)));
}

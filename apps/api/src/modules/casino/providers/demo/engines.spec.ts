import { describe, expect, it } from 'vitest';
import { ScriptedRandomSource, SeededRandomSource } from '../random-source.js';
import { diceMultiplierMilli, playDice } from './dice.engine.js';
import { SLOTS_PAYTABLE, evaluateReels, playSlots, spinReel } from './slots.engine.js';

describe('dice engine', () => {
  it('derives multipliers from win chance with a 1 % edge', () => {
    expect(diceMultiplierMilli(50, 'under')).toBe(1980);
    expect(diceMultiplierMilli(2, 'under')).toBe(49_500);
    expect(diceMultiplierMilli(98, 'under')).toBe(1010);
    expect(diceMultiplierMilli(50, 'over')).toBe(2020);
  });

  it('pays stake × multiplier on a win and nothing on a loss', () => {
    const win = playDice(1000n, 50, 'under', new ScriptedRandomSource([0.1]));
    expect(win.outcome.roll).toBe(10);
    expect(win.outcome.win).toBe(true);
    expect(win.payoutMinor).toBe(1980n);
    const loss = playDice(1000n, 50, 'under', new ScriptedRandomSource([0.9]));
    expect(loss.outcome.win).toBe(false);
    expect(loss.payoutMinor).toBe(0n);
  });

  it('is deterministic for a seeded source', () => {
    const a = playDice(500n, 75, 'over', new SeededRandomSource(7));
    const b = playDice(500n, 75, 'over', new SeededRandomSource(7));
    expect(a).toEqual(b);
  });
});

describe('slots engine', () => {
  it('maps random values onto weighted reels', () => {
    expect(spinReel(new ScriptedRandomSource([0]))).toBe('anchor');
    expect(spinReel(new ScriptedRandomSource([0.999]))).toBe('crown');
  });

  it('evaluates the paytable including the crown pair consolation', () => {
    expect(evaluateReels(['crown', 'crown', 'crown']).row?.multiplier).toBe(100);
    expect(evaluateReels(['anchor', 'anchor', 'anchor']).row?.multiplier).toBe(2);
    expect(evaluateReels(['crown', 'anchor', 'crown']).row?.label).toBe('Crown pair');
    expect(evaluateReels(['anchor', 'shell', 'compass']).row).toBeNull();
  });

  it('pays stake × multiplier for a scripted jackpot', () => {
    const { outcome, payoutMinor } = playSlots(
      200n,
      new ScriptedRandomSource([0.999, 0.999, 0.999]),
    );
    expect(outcome.reels).toEqual(['crown', 'crown', 'crown']);
    expect(payoutMinor).toBe(200n * BigInt(SLOTS_PAYTABLE[0]!.multiplier));
  });
});

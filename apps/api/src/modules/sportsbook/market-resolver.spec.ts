import { describe, expect, it } from 'vitest';
import { resolveBetStatus, resolveMarket } from './market-resolver.js';

const sel = (id: string, outcomeKey: string) => ({ id, outcomeKey });

describe('market resolver', () => {
  it('resolves match winner', () => {
    const r = resolveMarket(
      {
        type: 'MATCH_WINNER',
        line: null,
        selections: [sel('h', 'HOME'), sel('d', 'DRAW'), sel('a', 'AWAY')],
      },
      2,
      1,
    );
    expect([r.get('h'), r.get('d'), r.get('a')]).toEqual(['WON', 'LOST', 'LOST']);
  });

  it('resolves totals and voids a push on a whole-number line', () => {
    const over = resolveMarket(
      { type: 'TOTAL', line: 2.5, selections: [sel('o', 'OVER'), sel('u', 'UNDER')] },
      2,
      1,
    );
    expect([over.get('o'), over.get('u')]).toEqual(['WON', 'LOST']);
    const push = resolveMarket(
      { type: 'TOTAL', line: 3, selections: [sel('o', 'OVER'), sel('u', 'UNDER')] },
      2,
      1,
    );
    expect([push.get('o'), push.get('u')]).toEqual(['VOID', 'VOID']);
  });

  it('resolves both teams to score and handicaps', () => {
    const btts = resolveMarket(
      { type: 'BOTH_TEAMS_TO_SCORE', line: null, selections: [sel('y', 'YES'), sel('n', 'NO')] },
      0,
      3,
    );
    expect([btts.get('y'), btts.get('n')]).toEqual(['LOST', 'WON']);
    const hcp = resolveMarket(
      { type: 'HANDICAP', line: -1.5, selections: [sel('h', 'HOME'), sel('a', 'AWAY')] },
      2,
      1,
    );
    expect([hcp.get('h'), hcp.get('a')]).toEqual(['LOST', 'WON']);
  });

  it('derives the bet outcome from its legs', () => {
    expect(resolveBetStatus(['WON', 'WON'])).toBe('WON');
    expect(resolveBetStatus(['WON', 'LOST'])).toBe('LOST');
    expect(resolveBetStatus(['WON', null])).toBeNull();
    expect(resolveBetStatus(['LOST', null])).toBe('LOST');
    expect(resolveBetStatus(['VOID', 'VOID'])).toBe('VOID');
    expect(resolveBetStatus(['VOID', 'WON'])).toBe('WON');
  });
});

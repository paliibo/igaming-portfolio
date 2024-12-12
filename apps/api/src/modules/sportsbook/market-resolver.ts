import type { MarketType, SelectionResult } from '@igaming/database';

export interface ResolvableMarket {
  type: MarketType;
  line: number | null;
  selections: { id: string; outcomeKey: string }[];
}

/**
 * Pure settlement rules. Outcome keys:
 *  MATCH_WINNER: HOME | DRAW | AWAY
 *  TOTAL:        OVER | UNDER   (line e.g. 2.5; whole-number lines push → VOID)
 *  BOTH_TEAMS_TO_SCORE: YES | NO
 *  HANDICAP:     HOME | AWAY     (line applied to the home side, e.g. -1.5)
 */
export function resolveMarket(
  market: ResolvableMarket,
  homeScore: number,
  awayScore: number,
): Map<string, SelectionResult> {
  const results = new Map<string, SelectionResult>();
  const total = homeScore + awayScore;
  for (const selection of market.selections) {
    results.set(
      selection.id,
      resolveSelection(market.type, market.line, selection.outcomeKey, homeScore, awayScore, total),
    );
  }
  return results;
}

function resolveSelection(
  type: MarketType,
  line: number | null,
  key: string,
  home: number,
  away: number,
  total: number,
): SelectionResult {
  switch (type) {
    case 'MATCH_WINNER': {
      const winner = home > away ? 'HOME' : home < away ? 'AWAY' : 'DRAW';
      return key === winner ? 'WON' : 'LOST';
    }
    case 'TOTAL': {
      if (line === null) return 'VOID';
      if (total === line) return 'VOID';
      const over = total > line;
      return (key === 'OVER') === over ? 'WON' : 'LOST';
    }
    case 'BOTH_TEAMS_TO_SCORE': {
      const both = home > 0 && away > 0;
      return (key === 'YES') === both ? 'WON' : 'LOST';
    }
    case 'HANDICAP': {
      if (line === null) return 'VOID';
      const adjusted = home + line - away;
      if (adjusted === 0) return 'VOID';
      const homeCovers = adjusted > 0;
      return (key === 'HOME') === homeCovers ? 'WON' : 'LOST';
    }
    default:
      return 'VOID';
  }
}

/** Bet-level outcome from its selections: any LOST → LOST; all decided and none lost → WON (VOIDs price at 1.0). */
export function resolveBetStatus(
  selectionResults: (SelectionResult | null)[],
): 'WON' | 'LOST' | 'VOID' | null {
  if (selectionResults.some((r) => r === 'LOST')) return 'LOST';
  if (selectionResults.some((r) => r === null)) return null;
  if (selectionResults.every((r) => r === 'VOID')) return 'VOID';
  return 'WON';
}

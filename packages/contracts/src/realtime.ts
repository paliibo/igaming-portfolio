import type { MarketStatus, SportsEventStatus, BetStatus } from './enums.js';
import type { Minor } from './types.js';

export const WS_PATH = '/ws';

export const WS_CLIENT_EVENTS = {
  subscribeEvent: 'event:subscribe',
  unsubscribeEvent: 'event:unsubscribe',
} as const;

export const WS_SERVER_EVENTS = {
  oddsUpdate: 'odds:update',
  marketStatus: 'market:status',
  eventUpdate: 'event:update',
  walletUpdate: 'wallet:update',
  betSettled: 'bet:settled',
} as const;

export interface OddsUpdatePayload {
  eventId: string;
  marketId: string;
  selectionId: string;
  previousPriceMilli: number;
  priceMilli: number;
  priceVersion: number;
  updatedAt: string;
}

export interface MarketStatusPayload {
  eventId: string;
  marketId: string;
  status: MarketStatus;
}

export interface EventUpdatePayload {
  eventId: string;
  status: SportsEventStatus;
  homeScore: number;
  awayScore: number;
  clockMinute: number;
  periodLabel: string | null;
}

export interface WalletUpdatePayload {
  walletId: string;
  balanceMinor: Minor;
  updatedAt: string;
  reason: string;
}

export interface BetSettledPayload {
  betId: string;
  status: BetStatus;
  payoutMinor: Minor;
}

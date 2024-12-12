import type { GameRulesDto, RoundInput, RoundOutcome } from '@igaming/contracts';
import type { RandomSource } from './random-source.js';

export interface ProviderGameDefinition {
  providerGameId: string;
  rules: GameRulesDto;
}

export interface ProviderSessionContext {
  userId: string;
  gameSlug: string;
  providerGameId: string;
}

export interface ProviderRoundRequest {
  providerSessionRef: string;
  providerGameId: string;
  roundKey: string;
  stakeMinor: bigint;
  input: RoundInput;
  random: RandomSource;
}

export interface ProviderRoundResult {
  providerRoundRef: string;
  payoutMinor: bigint;
  outcome: RoundOutcome;
}

/**
 * Boundary between the platform and a game provider. The platform owns the wallet, the ledger,
 * limits and persistence; a provider owns game maths. An external provider adapter would call a
 * remote API in each method; the demo adapter computes in-process.
 */
export interface GameProviderAdapter {
  readonly key: string;
  getGame(providerGameId: string): ProviderGameDefinition | null;
  isAvailable(providerGameId: string): boolean;
  createSession(ctx: ProviderSessionContext): Promise<{ providerSessionRef: string }>;
  playRound(request: ProviderRoundRequest): Promise<ProviderRoundResult>;
  closeSession(providerSessionRef: string): Promise<void>;
}

export const GAME_PROVIDERS = Symbol('GAME_PROVIDERS');

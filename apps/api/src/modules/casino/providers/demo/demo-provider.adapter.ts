import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { GameRulesDto } from '@igaming/contracts';
import type {
  GameProviderAdapter,
  ProviderGameDefinition,
  ProviderRoundRequest,
  ProviderRoundResult,
  ProviderSessionContext,
} from '../provider.interface.js';
import {
  DICE_HOUSE_EDGE_PERCENT,
  DICE_MAX_TARGET,
  DICE_MIN_TARGET,
  playDice,
} from './dice.engine.js';
import { SLOT_SYMBOLS, SLOTS_PAYTABLE, playSlots } from './slots.engine.js';
import { DomainError } from '../../../../common/errors.js';

export const DEMO_PROVIDER_KEY = 'demo-studio';

const GAMES: Record<string, GameRulesDto> = {
  'demo-dice': {
    slug: 'harbor-dice',
    summary:
      'Pick a target between 2 and 98 and whether the roll lands under or over it. The multiplier is derived from the win chance with a fixed 1 % house edge.',
    dice: {
      houseEdgePercent: DICE_HOUSE_EDGE_PERCENT,
      minTarget: DICE_MIN_TARGET,
      maxTarget: DICE_MAX_TARGET,
      multiplierFormula: '(100 − 1) ÷ win chance %',
    },
  },
  'demo-slots': {
    slug: 'harbor-reels',
    summary:
      'Three weighted reels. Match three symbols on the centre line for a paytable multiplier; two Harbor Crowns pay a small consolation.',
    slots: {
      symbols: SLOT_SYMBOLS.map((s) => ({ key: s.key, label: s.label, weight: s.weight })),
      paytable: SLOTS_PAYTABLE,
    },
  },
};

/** In-process provider: the game maths run inside the API and are fully auditable. */
@Injectable()
export class DemoProviderAdapter implements GameProviderAdapter {
  readonly key = DEMO_PROVIDER_KEY;

  getGame(providerGameId: string): ProviderGameDefinition | null {
    const rules = GAMES[providerGameId];
    return rules ? { providerGameId, rules } : null;
  }

  isAvailable(providerGameId: string): boolean {
    return providerGameId in GAMES;
  }

  async createSession(_ctx: ProviderSessionContext): Promise<{ providerSessionRef: string }> {
    return { providerSessionRef: `${this.key}-${randomUUID()}` };
  }

  async playRound(request: ProviderRoundRequest): Promise<ProviderRoundResult> {
    const providerRoundRef = `${this.key}-r-${randomUUID()}`;
    if (request.providerGameId === 'demo-dice') {
      if (request.input.type !== 'dice')
        throw new DomainError('INVALID_GAME_INPUT', 'Dice requires a target and direction');
      const { outcome, payoutMinor } = playDice(
        request.stakeMinor,
        request.input.target,
        request.input.direction,
        request.random,
      );
      return { providerRoundRef, outcome, payoutMinor };
    }
    if (request.providerGameId === 'demo-slots') {
      if (request.input.type !== 'slots')
        throw new DomainError('INVALID_GAME_INPUT', 'Slots does not accept parameters');
      const { outcome, payoutMinor } = playSlots(request.stakeMinor, request.random);
      return { providerRoundRef, outcome, payoutMinor };
    }
    throw new DomainError(
      'GAME_NOT_PLAYABLE',
      'This catalogue entry is a showcase listing without a playable engine',
      409,
    );
  }

  async closeSession(_providerSessionRef: string): Promise<void> {
    return;
  }
}

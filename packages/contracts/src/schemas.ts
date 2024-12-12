import { z } from 'zod';
import {
  GAME_CATEGORIES,
  GAME_STATUSES,
  KYC_STATUSES,
  LIMIT_TYPES,
  MARKET_STATUSES,
  PLAYER_STATUSES,
  RISK_ALERT_STATUSES,
} from './enums.js';

export const minorAmountSchema = z
  .string()
  .regex(/^\d{1,15}$/, 'amount must be a string of integer minor units')
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > 0n, 'amount must be positive');

export const idempotencyKeySchema = z.string().min(8).max(128);
export const uuidSchema = z.uuid();

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// ---- auth ----
export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  displayName: z.string().min(2).max(40),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ---- wallet ----
export const topupSchema = z.object({
  amountMinor: minorAmountSchema,
  idempotencyKey: idempotencyKeySchema,
});
export type TopupInput = z.infer<typeof topupSchema>;

export const walletTransactionsQuerySchema = paginationQuerySchema.extend({
  kind: z.string().optional(),
});

// ---- sportsbook ----
export const eventsQuerySchema = z.object({
  sport: z.string().optional(),
  status: z.enum(['upcoming', 'live', 'finished', 'all']).default('upcoming'),
  featured: z.coerce.boolean().optional(),
});

export const placeBetSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  stakeMinor: minorAmountSchema,
  selections: z
    .array(
      z.object({
        selectionId: uuidSchema,
        priceMilli: z.number().int().min(1001).max(1_000_000),
      }),
    )
    .min(1)
    .max(10),
  acceptPriceChanges: z.boolean().default(false),
});
export type PlaceBetInput = z.infer<typeof placeBetSchema>;

export const betsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'settled', 'all']).default('all'),
});

export const createEventSchema = z.object({
  sportSlug: z.string().min(2),
  competition: z.string().min(2).max(80),
  homeTeam: z.string().min(2).max(60),
  awayTeam: z.string().min(2).max(60),
  startsAt: z.iso.datetime(),
  featured: z.boolean().default(false),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventStateSchema = z.object({
  status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED']).optional(),
  homeScore: z.number().int().min(0).max(300).optional(),
  awayScore: z.number().int().min(0).max(300).optional(),
  clockMinute: z.number().int().min(0).max(120).optional(),
  periodLabel: z.string().max(20).nullable().optional(),
});
export type UpdateEventStateInput = z.infer<typeof updateEventStateSchema>;

export const updateMarketStatusSchema = z.object({
  status: z.enum(MARKET_STATUSES).exclude(['SETTLED']),
});
export const updateSelectionPriceSchema = z.object({
  priceMilli: z.number().int().min(1001).max(1_000_000),
});
export const settleEventSchema = z.object({
  homeScore: z.number().int().min(0).max(300),
  awayScore: z.number().int().min(0).max(300),
});
export type SettleEventInput = z.infer<typeof settleEventSchema>;

// ---- casino ----
export const gamesQuerySchema = z.object({
  category: z.enum(GAME_CATEGORIES).optional(),
  search: z.string().max(60).optional(),
  featured: z.coerce.boolean().optional(),
});

export const createSessionSchema = z.object({ gameSlug: z.string().min(2) });

export const diceInputSchema = z.object({
  type: z.literal('dice'),
  target: z.number().int().min(2).max(98),
  direction: z.enum(['under', 'over']),
});
export const slotsInputSchema = z.object({ type: z.literal('slots') });
export const roundInputSchema = z.discriminatedUnion('type', [diceInputSchema, slotsInputSchema]);
export type RoundInput = z.infer<typeof roundInputSchema>;

export const playRoundSchema = z.object({
  sessionId: uuidSchema,
  clientRoundKey: idempotencyKeySchema,
  stakeMinor: minorAmountSchema,
  input: roundInputSchema,
});
export type PlayRoundInput = z.infer<typeof playRoundSchema>;

export const roundsQuerySchema = paginationQuerySchema.extend({
  gameSlug: z.string().optional(),
});

export const updateGameSchema = z.object({
  status: z.enum(GAME_STATUSES).optional(),
  featured: z.boolean().optional(),
  minStakeMinor: minorAmountSchema.optional(),
  maxStakeMinor: minorAmountSchema.optional(),
});
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

// ---- admin ----
export const playersQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(80).optional(),
  status: z.enum(PLAYER_STATUSES).optional(),
  kycStatus: z.enum(KYC_STATUSES).optional(),
});

export const updatePlayerStatusSchema = z.object({
  status: z.enum(PLAYER_STATUSES),
  reason: z.string().min(3).max(300),
  days: z.number().int().min(1).max(3650).optional(),
});
export type UpdatePlayerStatusInput = z.infer<typeof updatePlayerStatusSchema>;

export const updateKycSchema = z.object({ kycStatus: z.enum(KYC_STATUSES) });

export const setLimitSchema = z.object({
  type: z.enum(LIMIT_TYPES),
  amountMinor: minorAmountSchema.nullable(),
});
export type SetLimitInput = z.infer<typeof setLimitSchema>;

export const createNoteSchema = z.object({ body: z.string().min(2).max(2000) });

export const adjustmentSchema = z.object({
  direction: z.enum(['CREDIT', 'DEBIT']),
  amountMinor: minorAmountSchema,
  reason: z.string().min(3).max(300),
  idempotencyKey: idempotencyKeySchema,
});
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export const reverseEntrySchema = z.object({ reason: z.string().min(3).max(300) });

export const dateRangeSchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const adminTransactionsQuerySchema = paginationQuerySchema
  .extend(dateRangeSchema.shape)
  .extend({
    playerId: uuidSchema.optional(),
    kind: z.string().optional(),
    referenceId: z.string().optional(),
  });
export const adminJournalQuerySchema = paginationQuerySchema.extend(dateRangeSchema.shape).extend({
  kind: z.string().optional(),
  referenceId: z.string().optional(),
  playerId: uuidSchema.optional(),
});
export const adminBetsQuerySchema = paginationQuerySchema.extend(dateRangeSchema.shape).extend({
  playerId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
  status: z.string().optional(),
});
export const adminRoundsQuerySchema = paginationQuerySchema.extend(dateRangeSchema.shape).extend({
  playerId: uuidSchema.optional(),
  gameId: uuidSchema.optional(),
});
export const alertsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(RISK_ALERT_STATUSES).optional(),
  playerId: uuidSchema.optional(),
});
export const updateAlertSchema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) });
export const auditQuerySchema = paginationQuerySchema.extend(dateRangeSchema.shape).extend({
  action: z.string().optional(),
  actorId: uuidSchema.optional(),
  targetId: z.string().optional(),
});
export const reportsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
});

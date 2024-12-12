# SpinHarbor — Casino Platform & Game Aggregation

**Problem.** A casino platform integrates many game providers while owning the wallet: every
round must debit exactly once, pay exactly once, survive retries and remain auditable.

**What is implemented**

- Home, lobby with search and categories (slots, dice, table, instant), game detail with rules
  and paytable, playable Harbor Dice and Harbor Reels, favourites, round history, account/wallet,
  operator catalogue management (status, featured, stake limits).
- `GameProviderAdapter` interface (`getGame`, `isAvailable`, `createSession`, `playRound`,
  `closeSession`) with an in-process demo adapter. The platform owns sessions, stake validation,
  limits, ledger postings and round persistence; a provider owns only game maths. External
  providers plug in by implementing the interface.
- Harbor Dice: target 2–98, under/over, multiplier `(100 − 1 %) ÷ win chance` in thousandths.
  Harbor Reels: three weighted reels, explicit paytable (crown jackpot ×100 … anchor ×2, crown
  pair ×3).
- Each round = one Postgres transaction: wallet lock → status/limit checks → provider outcome →
  `CASINO_STAKE` entry → optional `CASINO_PAYOUT` entry → round row with both entry ids. The unique
  `(userId, clientRoundKey)` makes retries replay the stored round, including concurrent retries.
- Randomness through an injectable `RandomSource` (CSPRNG in production, scripted/seeded in tests).
- Rounds appear in the player's history, in LedgerArc rounds/transactions/journal and in the
  dashboard metrics because they are read from the same tables.

**Stack.** Next.js 16, React 19, TanStack Query, Tailwind v4, CSS animations; NestJS casino module,
Prisma, provider adapter pattern.

**Engineering challenges.** Exactly-once stake/payout under retries; keeping the client animation
cosmetic while the server result is authoritative; a provider boundary that does not leak wallet
responsibilities.

**Limitations.** Six of the eight catalogue entries are showcase listings without engines; no
external provider, no free spins/bonuses, no certified RNG or audited RTP.

# CV project descriptions

Independent portfolio projects (2026). Simulated virtual currency; no commercial deployment, users
or revenue.

## LinePulse — Real-Time Sportsbook & Betting Platform

- Built a sportsbook MVP with live odds, market suspension and match progression streamed over
  Socket.IO from a simulated feed, with reconnect-safe client subscriptions.
- Implemented atomic bet placement (single and accumulator) that locks the wallet row, re-validates
  prices, market/event status, balance and daily limits in one PostgreSQL transaction and returns a
  `PRICE_CHANGED` conflict for stale odds.
- Designed idempotent, BullMQ-driven settlement: a pure market resolver plus conditional
  `OPEN → final` claiming so repeated or concurrent jobs never pay a bet twice.
- Covered the lifecycle with integration tests on a real database, including the 1,000 → 980 →
  1,030 credit acceptance scenario and duplicate-settlement prevention.

Stack: TypeScript, Next.js 16, React 19, TanStack Query, Zustand, Tailwind CSS v4, NestJS 12,
Prisma 7, PostgreSQL, Redis, BullMQ, Socket.IO, Vitest, Playwright.

## SpinHarbor — Casino Platform & Game Integration

- Designed a provider-adapter architecture (`createSession`, `playRound`, `closeSession`) that keeps
  wallet, limits, persistence and ledger postings in the platform and leaves only game maths to the
  provider; shipped an in-process demo provider.
- Implemented two playable games (dice with derived multipliers, three-reel slots with an explicit
  paytable) whose outcomes are computed server-side from an injectable random source, making tests
  deterministic.
- Made each round exactly-once: stake debit, payout credit and round record commit in a single
  transaction, with `(userId, clientRoundKey)` uniqueness replaying retries, including concurrent ones.
- Delivered lobby, catalogue, favourites, history and operator catalogue management on the shared
  design system.

Stack: TypeScript, Next.js 16, React 19, TanStack Query, Tailwind CSS v4, NestJS 12, Prisma 7,
PostgreSQL, Redis, Vitest, Playwright.

## LedgerArc — Gaming Wallet & Financial Operations

- Built a double-entry ledger in integer minor units (`BigInt`) with balanced journal entries,
  row-locked wallet updates, append-only corrections through reversing entries and a reconciliation
  check that recomputes every wallet from the journal.
- Implemented responsible-gaming controls enforced inside the money path: self-exclusion,
  cooling-off, suspension, daily top-up/wager/loss limits, automatic risk alerts and a mocked KYC
  state machine.
- Delivered an operator back office with ledger-derived dashboard metrics, player profiles, journal
  and transaction explorers with cursor pagination and filters, daily reports with explicit
  accounting definitions, and an audit log of every operator action.
- Secured the platform with bcrypt, HttpOnly cookie sessions, role-based guards, Origin checks and
  Redis rate limiting, with zod schemas driving both validation and Swagger.

Stack: TypeScript, Next.js 16, React 19, Recharts, TanStack Query, Tailwind CSS v4, NestJS 12,
Prisma 7, PostgreSQL, Redis, Vitest, Playwright.

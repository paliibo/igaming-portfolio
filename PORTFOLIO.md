# Portfolio — iGaming engineering showcase

Three independent portfolio projects built on one shared backend in a pnpm/Turborepo monorepo.
Each is a working application with real persistence, backend-enforced business rules and tests.
They are personal projects with simulated currency, not commercial products.

## LinePulse — Real-Time Sportsbook & Betting Platform

A sportsbook with a live odds feed (simulated), a betslip that handles price changes honestly, and
asynchronous settlement that cannot double-pay. The interesting parts are inside the bet-placement
transaction (balance lock, limit checks, price re-validation) and the settlement worker (market
resolver + conditional bet claiming). Includes an automated acceptance test for the exact
1,000 → 980 → 1,030 credit scenario.

## SpinHarbor — Casino Platform & Game Integration

A casino lobby with a provider-adapter boundary and two genuinely playable games whose outcomes
are computed server-side from an injectable random source. Each round is a single transaction
that debits the stake once, pays once and persists an auditable record; retries, including
concurrent ones, replay the stored round.

## LedgerArc — Gaming Wallet & Financial Operations

The financial core the other two apps post to: a double-entry journal in integer minor units,
row-locked wallet updates, reversal-based corrections, responsible-gaming limits and an operator
back office with reconciliation, reports, risk alerts and a full audit trail.

## Shared platform

NestJS 12 (ESM) modular monolith · Prisma 7 on PostgreSQL 17 · Redis 7 with BullMQ · Socket.IO ·
JWT cookie sessions with RBAC · zod contracts shared with three Next.js 16 / React 19 frontends ·
Tailwind v4 design system package · Vitest integration tests on a real database · Playwright.

Source: https://github.com/paliibo/igaming-portfolio

Run it: `pnpm install && docker compose up -d && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev`.

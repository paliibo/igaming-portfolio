# LinePulse — Real-Time Sportsbook

**Problem.** A sportsbook has to accept bets against prices that change every few seconds,
without ever paying out on a stale price, double-debiting a wallet, or settling the same bet twice.

**What is implemented**

- Dashboard, sports listing (upcoming / live / results), event detail with all markets
  (match result, totals, both teams to score, handicap; money line, total points, spread for
  basketball), betslip, My Bets, bet history, account/wallet with demo top-up, operator console.
- Live odds, market suspension and match clock/score updates over Socket.IO with reconnect
  handling; price changes flash on the odds buttons.
- Singles and accumulators (selections from different events; combined price = product of
  thousandth prices, floored in `BigInt`).
- Placement validates stake range, market and event status, balance, daily wager/loss limits and
  player status inside one transaction with the wallet debit; stale prices return `PRICE_CHANGED`
  and the player must accept the new price.
- Settlement: operator enters a final score (or the simulator finishes the match) → BullMQ job →
  market resolver assigns WON / LOST / VOID per selection → each open bet is claimed with a
  conditional update and paid or refunded once → `bet:settled` and `wallet:update` pushed to the
  player. Cancelled events refund every open bet.
- Automated acceptance test: 1,000.00 → stake 20.00 @ 2.50 → 980.00 → win → 1,030.00, with the
  three wallet transactions and balanced journal entries asserted.

**Stack.** Next.js 16 App Router, React 19, TanStack Query, Zustand (persisted betslip), React Hook
Form + zod, Tailwind v4, shared `@igaming/ui`; NestJS sportsbook module, Prisma, BullMQ, Socket.IO.

**Engineering challenges.** Keeping odds-change detection inside the same transaction as the
debit; making settlement idempotent under concurrent workers; representing prices and payouts in
integers only; keeping the simulator's price moves and market suspensions consistent with the
persisted state the API serves.

**Limitations.** Simulated feed; four market types; no cash-out, no in-play bet delay, no
multi-currency.

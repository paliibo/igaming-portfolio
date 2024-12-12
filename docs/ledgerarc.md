# LedgerArc — Gaming Wallet, Ledger & Operator Back Office

**Problem.** Operators need one place where every credit that moved across sportsbook and casino is
explainable, reconcilable and correctable without ever editing history.

**What is implemented**

- Overview dashboard (players, credits in circulation, stakes/payouts/GGR per vertical, open
  alerts, 14-day activity, recent transactions) with a 10-second Redis cache.
- Player management: search/filter, profile with wallet, stats, limits (daily top-up, wager,
  loss with today's usage), notes, alerts, status changes (active, suspended, cooling-off,
  self-excluded, closed), mocked KYC states, admin-only balance adjustments.
- Wallet balances per ledger account, transaction history, journal with per-entry lines, reversals
  as mirrored entries (an entry can be reversed once; reversals cannot be reversed), sports bets and
  casino rounds views with filters, daily financial reports with explicit accounting definitions,
  risk alerts (large stake, rapid play, limit-breach attempts, daily loss, manual), audit logs of
  every operator action (actor, action, target, metadata, IP).
- Reconciliation endpoint and view: every journal entry balances; every cached wallet balance
  equals its ledger balance.
- Role model: PLAYER / OPERATOR / ADMIN enforced server-side; the UI hides what the role cannot do
  and handles 403s.

**Stack.** Next.js 16, Recharts, TanStack Query, Tailwind v4 (light enterprise theme); NestJS
admin, wallet, ledger, risk and audit modules; Prisma; raw SQL for aggregates.

**Engineering challenges.** Designing accounts and sign conventions so dashboard totals are
mathematically consistent with the journal; cursor pagination on high-volume tables; keeping
corrections append-only.

**Limitations.** No multi-currency, no document-based KYC, no scheduled report exports, no
four-eyes approval on adjustments.

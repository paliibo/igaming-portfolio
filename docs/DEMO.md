# Demo guide

Everything in this repository runs on virtual demo credits (`DMO`). There is no real money, no
payment gateway and no licensed gambling functionality.

## Demo accounts

Created by `pnpm db:seed` and configurable in `.env` (`DEMO_*` variables). Change them before
exposing any environment publicly; in `NODE_ENV=production` the API refuses to boot with the demo
reset endpoint enabled and requires a 32+ character `JWT_SECRET`.

| Role     | Email                 | Password       | Use in                                            |
| -------- | --------------------- | -------------- | ------------------------------------------------- |
| Player   | `player@demo.local`   | `Player123!`   | LinePulse, SpinHarbor (1,000.00 DMO, no history)  |
| Operator | `operator@demo.local` | `Operator123!` | LedgerArc, operator pages in LinePulse/SpinHarbor |
| Admin    | `admin@demo.local`    | `Admin123!`    | LedgerArc adjustments, reversals, demo reset      |

Five extra seeded players (`ava.morgan@…`, `liam.chen@…`, `noah.petrov@…`, `mia.santos@…`,
`ethan.kowalski@…`, password `Player123!`) carry settled bets, casino rounds, limits, a rejected KYC
and a self-exclusion so the back office has data on first open. Their history is time-shifted over
the previous ten days; amounts are produced by the real services.

## Suggested walkthrough (10 minutes)

1. **LinePulse** (`http://localhost:3000`): sign in as the player. Watch odds move on the dashboard
   (the simulator drifts prices every few seconds and broadcasts over Socket.IO). Open the live
   event, add a selection, stake 20, place the bet. The header balance drops to 980.00 immediately.
2. Still in LinePulse, open **My Bets**. Keep the tab open.
3. **LedgerArc** (`http://localhost:3002`): sign in as the operator. Overview shows credits in
   circulation and the stake you just placed in recent transactions. Open **Journal** to see the
   balanced `BET_STAKE` entry (wallet debit / sportsbook revenue credit).
4. In LinePulse, sign out, sign in as the operator and open **Operator**. Settle the event with a
   score that makes your selection win. Settlement runs on the BullMQ worker; the player tab
   receives `bet:settled` and `wallet:update` and shows the payout.
5. **SpinHarbor** (`http://localhost:3001`): sign in as the player, open Harbor Dice, play a few
   rounds, then Harbor Reels. Each round is one transaction: stake debit, outcome, payout credit.
6. Back in LedgerArc: **Casino rounds**, **Transactions** filtered by the player, **Reports** and
   **Wallet balances → Run reconciliation** (every journal entry balances; cached wallet balances
   match the ledger).
7. As admin: post a manual adjustment on the player profile, then reverse it from the journal.
   Both actions appear in **Audit logs**.

## Reset

`pnpm db:reset` wipes the database and reseeds (development only). An admin can also call
`POST /api/admin/demo/reset` when `DEMO_RESET_ENABLED=true` (never in production).

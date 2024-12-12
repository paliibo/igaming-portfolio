# API overview

Base URL `http://localhost:4000/api`. Interactive docs at `/api/docs` (Swagger UI generated from
the zod schemas in `packages/contracts`). Authentication is an HttpOnly, SameSite=Lax cookie set by
`POST /auth/login`; state-changing requests must come from an allowed `Origin`.

Amounts are strings of integer minor units (`"2000"` = 20.00 DMO). Prices are integers in
thousandths (`2500` = 2.50). Lists are cursor paginated (`?cursor=&limit=`).

| Area                   | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health                 | `GET /health`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Auth                   | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Wallet                 | `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup` (idempotent)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Sportsbook             | `GET /sportsbook/sports`, `GET /sportsbook/events`, `GET /sportsbook/events/:id`, `POST /sportsbook/bets` (idempotent, 409 `PRICE_CHANGED`), `GET /sportsbook/bets`, `GET /sportsbook/bets/:id`                                                                                                                                                                                                                                                                                                      |
| Sportsbook operator    | `GET/POST /sportsbook/operator/events`, `PATCH /sportsbook/operator/events/:id`, `PATCH /sportsbook/operator/markets/:id`, `PATCH /sportsbook/operator/selections/:id/price`, `POST /sportsbook/operator/events/:id/settle`, `POST /sportsbook/operator/events/:id/cancel`                                                                                                                                                                                                                           |
| Casino                 | `GET /casino/games`, `GET /casino/games/:slug`, `GET/PUT/DELETE /casino/favorites[/:gameId]`, `POST /casino/sessions`, `POST /casino/sessions/:id/close`, `POST /casino/rounds` (idempotent by `clientRoundKey`), `GET /casino/rounds`, `GET /casino/rounds/:id`                                                                                                                                                                                                                                     |
| Casino operator        | `GET /casino/operator/games`, `PATCH /casino/operator/games/:id`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Admin (OPERATOR/ADMIN) | `GET /admin/dashboard`, `GET /admin/reports`, `GET /admin/players`, `GET /admin/players/:id`, `PATCH /admin/players/:id/status`, `PATCH /admin/players/:id/kyc`, `PUT /admin/players/:id/limits`, `POST /admin/players/:id/notes`, `GET /admin/transactions`, `GET /admin/journal`, `GET /admin/journal/:id`, `GET /admin/ledger/accounts`, `GET /admin/ledger/reconciliation`, `GET /admin/bets`, `GET /admin/rounds`, `GET /admin/risk/alerts`, `PATCH /admin/risk/alerts/:id`, `GET /admin/audit` |
| Admin only             | `POST /admin/players/:id/adjustments`, `POST /admin/journal/:id/reverse`, `POST /admin/demo/reset` (development only)                                                                                                                                                                                                                                                                                                                                                                                |

Error bodies: `{ statusCode, code, message, details? }`. Domain codes include `INSUFFICIENT_FUNDS`,
`LIMIT_EXCEEDED`, `PLAYER_RESTRICTED`, `MARKET_NOT_OPEN`, `EVENT_NOT_BETTABLE`, `PRICE_CHANGED`,
`STAKE_TOO_LOW`, `STAKE_TOO_HIGH`, `SESSION_CLOSED`, `GAME_NOT_PLAYABLE`, `IDEMPOTENCY_MISMATCH`,
`ALREADY_REVERSED`, `ORIGIN_NOT_ALLOWED`, `RATE_LIMITED`, `VALIDATION_FAILED`.

## WebSocket (Socket.IO, path `/ws`)

Server → client: `odds:update`, `market:status`, `event:update` (room `sportsbook`, everyone),
`wallet:update`, `bet:settled` (room `user:<id>`, authenticated by the session cookie on the
handshake). Client → server: `event:subscribe` / `event:unsubscribe` `{ eventId }`.

## Accounting model

Double-entry journal with five account kinds: `PLAYER_WALLET` (one per player, a liability of the
house), `HOUSE_FLOAT` (issuer of demo credits), `SPORTSBOOK_REVENUE`, `CASINO_REVENUE`,
`ADJUSTMENTS`. Every `JournalEntry` has ≥ 2 `JournalLine`s whose debits equal credits; the
service rejects anything else before writing. A wallet balance is the sum of credits minus debits on
its account; `Wallet.balanceMinor` caches that value and is updated in the same transaction under
`SELECT … FOR UPDATE`. `GET /admin/ledger/reconciliation` recomputes both invariants.

| Operation                          | Debit                                    | Credit                              |
| ---------------------------------- | ---------------------------------------- | ----------------------------------- |
| Welcome / demo top-up              | HOUSE_FLOAT                              | PLAYER_WALLET                       |
| Bet stake / casino stake           | PLAYER_WALLET                            | SPORTSBOOK_REVENUE / CASINO_REVENUE |
| Bet payout, refund / casino payout | SPORTSBOOK_REVENUE / CASINO_REVENUE      | PLAYER_WALLET                       |
| Manual credit (debit) adjustment   | ADJUSTMENTS (PLAYER_WALLET)              | PLAYER_WALLET (ADJUSTMENTS)         |
| Reversal                           | mirrors every line of the original entry |                                     |

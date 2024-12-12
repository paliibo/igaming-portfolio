# Frontend conventions (all three Next.js apps)

This guide is the contract between the three apps so they feel like one platform while keeping
distinct branding. Follow it exactly; the Playwright suite relies on the `data-testid` values.

## Stack and shared packages

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 (tokens in `src/app/globals.css`).
- `@igaming/ui` — shadcn-style primitives: `Button, Card*, Input, Textarea, Label, Badge, Table*, Dialog*,
Sheet*, Tabs*, DropdownMenu*, Select*, Skeleton, Spinner, Separator, Switch, Tooltip*, EmptyState,
ErrorState, StatCard, PageHeader, cn`. Colour utilities: `bg-background text-foreground bg-card
bg-primary text-primary-foreground bg-muted text-muted-foreground bg-accent border-border
text-success text-destructive text-warning text-brand bg-brand-soft bg-surface bg-surface-raised`.
  Price flash helpers: `animate-price-up`, `animate-price-down`, `animate-pulse-dot`, `tabular-nums`.
- `@igaming/api-client` — `apiFetch<T>(path, { method, body, query })` (cookie auth, throws `ApiError`
  with `.status`, `.code`, `.details`), `newIdempotencyKey()`, `queryKeys`, `ApiProvider`,
  `RealtimeProvider`, hooks `useMe, useLogin, useRegister, useLogout, useWallet, useWalletTransactions,
useTopUp, useApplyWalletSnapshot, useRealtime, useOddsUpdates, useMarketStatusUpdates,
useEventUpdates, useBetSettled, useEventRoom`.
- `@igaming/contracts` — every request schema (zod) and response type (`SportsEventDto`, `BetDto`,
  `CasinoGameDto`, `GameRoundDto`, `DashboardMetricsDto`, …), enums, `formatCredits`, `formatMinor`,
  `formatPrice`, `parseCreditsInput`, `creditsToMinor`. Read `packages/contracts/src/types.ts` and
  `schemas.ts` before writing a page.
- App-local helpers live in `src/lib/format.ts` (dates) — extend, do not duplicate contracts helpers.
- Forms: React Hook Form + `@hookform/resolvers/zod` with schemas from contracts where they exist.
- Client state that must survive navigation (betslip) uses Zustand with `persist` to `sessionStorage`.
- Toasts: `sonner` (`toast.success/error`). Icons: `lucide-react`. Charts: `recharts`.

## Money

Amounts cross the API as **strings of integer minor units** (100 minor = 1.00 DMO credit). Never do
arithmetic with floats. Display with `formatCredits(minor)` → `"1,000.00 DMO"` or `formatMinor`.
Convert user input with `parseCreditsInput("20")` → `"2000"` (returns `null` when invalid).
Odds are integers in thousandths (`priceMilli` 2500 → `formatPrice(2500)` = `"2.50"`).

## Auth and shell

- Session is an HttpOnly cookie set by the API; all apps share it (same host, different ports).
- `/login` page in every app: `<Input data-testid="login-email">`, `<Input data-testid="login-password">`,
  submit `<Button data-testid="login-submit">`. On success redirect to `?next=` or the app home.
  Show the seeded demo credentials in a muted panel under the form (read from
  `NEXT_PUBLIC_DEMO_PLAYER_EMAIL`-style env is NOT available; hard-code the documented demo
  accounts `player@demo.local / Player123!` and, for LedgerArc, `operator@demo.local / Operator123!`
  and `admin@demo.local / Admin123!`, labelled "demo credentials").
- Protected pages: a `RequireAuth` wrapper that renders a skeleton while `useMe` loads, redirects to
  `/login?next=<path>` when the user is `null`, and (LedgerArc only) shows an access-denied state
  when the role is `PLAYER`.
- Header shows the live wallet balance for signed-in players: element `data-testid="wallet-balance"`
  containing `formatCredits(balance)`. It must update from the `useWallet` cache (the
  `RealtimeProvider` patches that cache on `wallet:update`).
- User menu with display name, role badge, and a `data-testid="logout"` item calling `useLogout`
  then redirecting to `/login`.
- Realtime connection indicator (small dot + "Live"/"Reconnecting…") driven by `useRealtime().state`.
- Mobile: top bar with a `Sheet`-based navigation; desktop: horizontal nav (LinePulse, SpinHarbor) or
  collapsible sidebar (LedgerArc). All pages must be usable at 375px width.

## States

Every data view has loading (Skeleton), empty (`EmptyState`), error (`ErrorState` with retry) and
success states. Buttons that mutate show `loading` and are disabled while pending. Mutations surface
`ApiError.message` in a toast or inline alert; `PRICE_CHANGED` (409) is handled specially in the
betslip. Never show hard-coded balances, totals or placeholder copy.

## Accessibility

Semantic `<button>`, `<nav>`, `<main>`, `<table>`; labels on inputs; visible focus rings (already in
the token CSS); `aria-live="polite"` on balance and result regions; icon-only buttons get `aria-label`.

## Required test ids

| App        | Element                                  | data-testid                                     |
| ---------- | ---------------------------------------- | ----------------------------------------------- |
| all        | login inputs/button                      | `login-email`, `login-password`, `login-submit` |
| all        | header balance                           | `wallet-balance`                                |
| all        | logout menu item                         | `logout`                                        |
| LinePulse  | event card/link in lists                 | `event-card`                                    |
| LinePulse  | selection odds button                    | `odds-button`                                   |
| LinePulse  | betslip stake input                      | `betslip-stake`                                 |
| LinePulse  | betslip place button                     | `betslip-place`                                 |
| LinePulse  | accept new odds button                   | `betslip-accept-odds`                           |
| LinePulse  | bet placed confirmation                  | `bet-confirmation`                              |
| LinePulse  | My Bets row                              | `bet-row`                                       |
| SpinHarbor | game tile in lobby                       | `game-tile`                                     |
| SpinHarbor | dice stake input / play button / result  | `dice-stake`, `dice-play`, `dice-result`        |
| SpinHarbor | slots stake input / spin button / result | `slots-stake`, `slots-spin`, `slots-result`     |
| SpinHarbor | history row                              | `round-row`                                     |
| LedgerArc  | dashboard credits-in-circulation stat    | `metric-circulation`                            |
| LedgerArc  | transactions table row                   | `transaction-row`                               |
| LedgerArc  | players table row                        | `player-row`                                    |
| LedgerArc  | journal entry row                        | `journal-row`                                   |

## Local ports

Defaults: LinePulse 3000, SpinHarbor 3001, LedgerArc 3002, API 4000 (`NEXT_PUBLIC_API_URL`).
The root `.env` is loaded by `next.config.ts`; the API's `CORS_ORIGINS` must include the app origin.

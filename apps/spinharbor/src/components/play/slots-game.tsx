'use client';
import * as React from 'react';
import { RotateCw } from 'lucide-react';
import type { GameDetailDto, GameRoundDto, PlayRoundResponse } from '@igaming/contracts';
import { ApiError, newIdempotencyKey, useWallet } from '@igaming/api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@igaming/ui';
import { toast } from 'sonner';
import { usePlayRound } from '@/lib/casino-api';
import { clampMinor, formatCredits, formatMultiplier, minorToInput } from '@/lib/format';
import { describeError } from '@/lib/game-meta';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { SymbolGlyph, symbolLabel } from '@/components/games/symbol-glyph';
import { SlotsPaytable } from '@/components/games/rules-panel';
import { useGameSession } from './use-game-session';
import { PlayHeader, SessionGate } from './play-frame';
import { StakeInput, useStakeMinor } from './stake-input';
import { SessionRounds } from './session-rounds';

const FALLBACK_SYMBOLS = ['anchor', 'shell', 'compass', 'lantern', 'pearl', 'crown'];
const REEL_TICK_MS = 70;
const REEL_STOP_MS = [550, 775, 1000] as const;

type Reels = [string, string, string];

function defaultStake(game: GameDetailDto) {
  return minorToInput(clampMinor('500', game.minStakeMinor, game.maxStakeMinor));
}

export function SlotsGame({ game }: { game: GameDetailDto }) {
  const reducedMotion = useReducedMotion();
  const wallet = useWallet();
  const { session, error: sessionError, restart, opening } = useGameSession(game.slug, true);
  const play = usePlayRound(game.slug);
  const rules = game.rules.slots;
  const symbols = React.useMemo(
    () => (rules ? rules.symbols.map((s) => s.key) : FALLBACK_SYMBOLS),
    [rules],
  );

  const [stake, setStake] = React.useState(() => defaultStake(game));
  const [reels, setReels] = React.useState<Reels>(() => [
    symbols[0] ?? 'anchor',
    symbols[1] ?? 'shell',
    symbols[2] ?? 'compass',
  ]);
  const [spinningReels, setSpinningReels] = React.useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [result, setResult] = React.useState<PlayRoundResponse | null>(null);
  const [rounds, setRounds] = React.useState<GameRoundDto[]>([]);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const timers = React.useRef<number[]>([]);
  const spinningRef = React.useRef<[boolean, boolean, boolean]>([false, false, false]);

  const { minor: stakeMinor } = useStakeMinor(stake, game.minStakeMinor, game.maxStakeMinor);
  const spinning = spinningReels.some(Boolean);
  const busy = play.isPending || spinning;
  const sessionClosed = inlineError !== null && ApiError.is(play.error, 'SESSION_CLOSED');

  const clearTimers = React.useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);
  React.useEffect(() => clearTimers, [clearTimers]);

  const settle = (data: PlayRoundResponse) => {
    setResult(data);
    setRounds((prev) => [data.round, ...prev].slice(0, 25));
  };

  const animate = (data: PlayRoundResponse, finalReels: Reels) => {
    if (reducedMotion) {
      spinningRef.current = [false, false, false];
      setReels(finalReels);
      settle(data);
      return;
    }
    spinningRef.current = [true, true, true];
    setResult(null);
    setSpinningReels([true, true, true]);
    const ticker = window.setInterval(() => {
      setReels(
        (prev) =>
          prev.map((symbol, idx) =>
            spinningRef.current[idx]
              ? (symbols[Math.floor(Math.random() * symbols.length)] ?? symbol)
              : symbol,
          ) as Reels,
      );
    }, REEL_TICK_MS);
    timers.current.push(ticker);
    REEL_STOP_MS.forEach((delay, idx) => {
      const stop = window.setTimeout(() => {
        spinningRef.current[idx] = false;
        setReels(
          (prev) => prev.map((symbol, i) => (i === idx ? finalReels[idx] : symbol)) as Reels,
        );
        setSpinningReels(
          (prev) => prev.map((s, i) => (i === idx ? false : s)) as [boolean, boolean, boolean],
        );
        if (idx === REEL_STOP_MS.length - 1) {
          window.clearInterval(ticker);
          settle(data);
        }
      }, delay);
      timers.current.push(stop);
    });
  };

  const onSpin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !stakeMinor || busy) return;
    setInlineError(null);
    play.mutate(
      {
        sessionId: session.id,
        clientRoundKey: newIdempotencyKey(),
        stakeMinor,
        input: { type: 'slots' },
      },
      {
        onSuccess: (data) => {
          if (data.round.outcome.type !== 'slots') return;
          animate(data, data.round.outcome.reels);
        },
        onError: (error) => {
          const message = describeError(error);
          setInlineError(message);
          toast.error(message);
        },
      },
    );
  };

  const outcome = result?.round.outcome.type === 'slots' ? result.round.outcome : null;
  const showWin = Boolean(outcome?.win) && !spinning;

  return (
    <div className="space-y-5">
      <PlayHeader game={game} />
      <SessionGate error={sessionError} opening={opening} onRetry={restart}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <div
                  className={cn(
                    'rounded-2xl border border-border bg-surface p-4 sm:p-6',
                    showWin ? 'animate-win-glow border-brand/60' : '',
                  )}
                >
                  <div
                    className="grid grid-cols-3 gap-3"
                    role="img"
                    aria-label={`Reels showing ${reels.map((r) => symbolLabel(r, rules?.symbols)).join(', ')}`}
                  >
                    {reels.map((symbol, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface-raised via-card to-surface-raised shadow-inner"
                      >
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background/80 to-transparent"
                          aria-hidden
                        />
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background/80 to-transparent"
                          aria-hidden
                        />
                        <div
                          className={cn(
                            'flex h-full items-center justify-center',
                            spinningReels[idx]
                              ? 'animate-reel-blur'
                              : showWin
                                ? 'animate-pop-in'
                                : '',
                          )}
                        >
                          <SymbolGlyph symbol={symbol} className="h-[55%] w-[55%]" />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-brand/40"
                          aria-hidden
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Centre line pays. The reels are cosmetic; the outcome comes from the server.
                  </p>
                </div>

                <form onSubmit={onSpin} className="space-y-5">
                  <StakeInput
                    id="slots-stake"
                    testId="slots-stake"
                    value={stake}
                    onChange={setStake}
                    minStakeMinor={game.minStakeMinor}
                    maxStakeMinor={game.maxStakeMinor}
                    balanceMinor={wallet.data?.balanceMinor}
                    disabled={busy}
                  />
                  {inlineError ? (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      <span>{inlineError}</span>
                      {sessionClosed ? (
                        <Button type="button" size="sm" variant="outline" onClick={restart}>
                          Start a new session
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-base"
                    data-testid="slots-spin"
                    loading={play.isPending}
                    disabled={!session || stakeMinor === null || busy || sessionClosed}
                  >
                    <RotateCw aria-hidden className={spinning ? 'animate-spin' : ''} />{' '}
                    {spinning ? 'Spinning…' : 'Spin'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card
              data-testid="slots-result"
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                outcome && !spinning ? 'animate-pop-in' : '',
                outcome && !spinning
                  ? outcome.win
                    ? 'border-success/50'
                    : 'border-destructive/40'
                  : '',
              )}
            >
              <CardHeader>
                <CardTitle>Last spin</CardTitle>
              </CardHeader>
              <CardContent>
                {!result || !outcome || spinning ? (
                  <p className="text-sm text-muted-foreground">
                    {spinning ? 'Spinning…' : 'Spin the reels to see the result here.'}
                  </p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Result</dt>
                      <dd
                        className={cn(
                          'text-lg font-semibold',
                          outcome.win ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {outcome.win ? 'Win' : 'No win'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Line</dt>
                      <dd className="font-medium">{outcome.lineLabel ?? 'No winning line'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Multiplier</dt>
                      <dd className="tabular-nums">{formatMultiplier(outcome.multiplier)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Payout</dt>
                      <dd className="tabular-nums">{formatCredits(result.round.payoutMinor)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Net</dt>
                      <dd
                        className={cn(
                          'font-semibold tabular-nums',
                          outcome.win ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {formatCredits(result.round.netMinor, { sign: true })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">New balance</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCredits(result.wallet.balanceMinor)}
                      </dd>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground sm:col-span-3">
                      Round #{result.round.roundNumber}
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            <SessionRounds rounds={rounds} title="Last spins" />
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Paytable</CardTitle>
            </CardHeader>
            <CardContent>
              {rules ? (
                <SlotsPaytable
                  rules={rules}
                  compact
                  highlight={showWin ? (outcome?.lineLabel ?? null) : null}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The API did not publish a paytable for this title.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </SessionGate>
    </div>
  );
}

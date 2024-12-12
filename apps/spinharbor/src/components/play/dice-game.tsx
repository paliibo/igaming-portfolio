'use client';
import * as React from 'react';
import { Dices } from 'lucide-react';
import type { GameDetailDto, GameRoundDto, PlayRoundResponse } from '@igaming/contracts';
import { ApiError, newIdempotencyKey, useWallet } from '@igaming/api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, cn } from '@igaming/ui';
import { toast } from 'sonner';
import { usePlayRound } from '@/lib/casino-api';
import {
  DICE_MAX_TARGET,
  DICE_MIN_TARGET,
  clampTarget,
  diceMultiplierMilli,
  dicePayoutMinor,
  diceWinChancePercent,
  type DiceDirection,
} from '@/lib/dice-math';
import {
  clampMinor,
  formatCredits,
  formatMultiplierMilli,
  formatPercent,
  minorToInput,
} from '@/lib/format';
import { describeError } from '@/lib/game-meta';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useGameSession } from './use-game-session';
import { useCountUp } from './use-count-up';
import { PlayHeader, SessionGate } from './play-frame';
import { StakeInput, useStakeMinor } from './stake-input';
import { SessionRounds } from './session-rounds';

const ROLL_ANIMATION_MS = 600;

function defaultStake(game: GameDetailDto) {
  return minorToInput(clampMinor('1000', game.minStakeMinor, game.maxStakeMinor));
}

export function DiceGame({ game }: { game: GameDetailDto }) {
  const reducedMotion = useReducedMotion();
  const wallet = useWallet();
  const { session, error: sessionError, restart, opening } = useGameSession(game.slug, true);
  const play = usePlayRound(game.slug);
  const roll = useCountUp(reducedMotion);

  const [stake, setStake] = React.useState(() => defaultStake(game));
  const [target, setTarget] = React.useState(50);
  const [targetText, setTargetText] = React.useState('50');
  const [direction, setDirection] = React.useState<DiceDirection>('under');
  const [rolling, setRolling] = React.useState(false);
  const [result, setResult] = React.useState<PlayRoundResponse | null>(null);
  const [rounds, setRounds] = React.useState<GameRoundDto[]>([]);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  const { minor: stakeMinor, message: stakeMessage } = useStakeMinor(
    stake,
    game.minStakeMinor,
    game.maxStakeMinor,
  );
  const chance = diceWinChancePercent(target, direction);
  const multiplierMilli = diceMultiplierMilli(target, direction);
  const projectedPayout = stakeMinor ? dicePayoutMinor(stakeMinor, multiplierMilli) : null;
  const busy = play.isPending || rolling;
  const sessionClosed = inlineError !== null && ApiError.is(play.error, 'SESSION_CLOSED');

  const commitTarget = (next: number) => {
    const clamped = clampTarget(next);
    setTarget(clamped);
    setTargetText(String(clamped));
  };

  const onPlay = (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !stakeMinor || busy) return;
    setInlineError(null);
    play.mutate(
      {
        sessionId: session.id,
        clientRoundKey: newIdempotencyKey(),
        stakeMinor,
        input: { type: 'dice', target, direction },
      },
      {
        onSuccess: (data) => {
          const outcome = data.round.outcome;
          if (outcome.type !== 'dice') return;
          setResult(null);
          setRolling(true);
          roll.start(outcome.roll, ROLL_ANIMATION_MS, () => {
            setResult(data);
            setRounds((prev) => [data.round, ...prev].slice(0, 25));
            setRolling(false);
          });
        },
        onError: (error) => {
          const message = describeError(error);
          setInlineError(message);
          toast.error(message);
        },
      },
    );
  };

  const outcome = result?.round.outcome.type === 'dice' ? result.round.outcome : null;
  const displayRoll = roll.value;
  const winZoneStyle =
    direction === 'under'
      ? { left: 0, width: `${target}%` }
      : { left: `${target + 1}%`, width: `${99 - target}%` };

  return (
    <div className="space-y-5">
      <PlayHeader game={game} />
      <SessionGate error={sessionError} opening={opening} onRetry={restart}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div
                className={cn(
                  'relative rounded-xl border border-border bg-surface p-6 text-center',
                  outcome?.win && !rolling ? 'animate-win-glow border-brand/60' : '',
                )}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Roll</p>
                <p
                  className="mt-1 text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl"
                  aria-hidden
                >
                  {displayRoll === null ? '—' : displayRoll.toFixed(2)}
                </p>
                <div
                  className="relative mt-6 h-3 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <div
                    className="absolute inset-y-0 rounded-full bg-success/50 transition-[left,width] duration-200"
                    style={winZoneStyle}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/70"
                    style={{ left: `${target}%` }}
                  />
                  {displayRoll !== null ? (
                    <div
                      className={cn(
                        'absolute -top-0.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background shadow',
                        outcome && !rolling
                          ? outcome.win
                            ? 'bg-success'
                            : 'bg-destructive'
                          : 'bg-brand',
                      )}
                      style={{
                        left: `${displayRoll}%`,
                        transition: reducedMotion ? 'none' : 'left 60ms linear',
                      }}
                    />
                  ) : null}
                </div>
                <div
                  className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums"
                  aria-hidden
                >
                  <span>0</span>
                  <span>{target}</span>
                  <span>99.99</span>
                </div>
              </div>

              <form onSubmit={onPlay} className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dice-target">Target</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="dice-target"
                        type="number"
                        inputMode="numeric"
                        min={DICE_MIN_TARGET}
                        max={DICE_MAX_TARGET}
                        value={targetText}
                        disabled={busy}
                        onChange={(event) => {
                          setTargetText(event.target.value);
                          const parsed = Number(event.target.value);
                          if (
                            Number.isInteger(parsed) &&
                            parsed >= DICE_MIN_TARGET &&
                            parsed <= DICE_MAX_TARGET
                          )
                            setTarget(parsed);
                        }}
                        onBlur={() => commitTarget(Number(targetText))}
                        className="h-9 w-20 text-center tabular-nums"
                        aria-describedby="dice-target-hint"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Target slider"
                    min={DICE_MIN_TARGET}
                    max={DICE_MAX_TARGET}
                    step={1}
                    value={target}
                    disabled={busy}
                    onChange={(event) => commitTarget(Number(event.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                  <p id="dice-target-hint" className="text-xs text-muted-foreground">
                    Whole number from {DICE_MIN_TARGET} to {DICE_MAX_TARGET}.
                  </p>
                  <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-2">
                    {(['under', 'over'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={direction === option}
                        disabled={busy}
                        onClick={() => setDirection(option)}
                        className={cn(
                          'flex h-11 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50',
                          direction === option
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-surface-raised text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        Roll {option} {target}
                      </button>
                    ))}
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">Win chance</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{formatPercent(chance)}</dd>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">Multiplier</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-brand">
                      {formatMultiplierMilli(multiplierMilli)}
                    </dd>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">Payout on win</dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {projectedPayout ? formatCredits(projectedPayout) : '—'}
                    </dd>
                  </div>
                </dl>

                <StakeInput
                  id="dice-stake"
                  testId="dice-stake"
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
                  data-testid="dice-play"
                  loading={play.isPending}
                  disabled={!session || stakeMinor === null || busy || sessionClosed}
                  aria-describedby={stakeMessage ? 'dice-stake-hint' : undefined}
                >
                  <Dices aria-hidden /> {rolling ? 'Rolling…' : 'Roll the dice'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card
              data-testid="dice-result"
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                outcome && !rolling ? 'animate-pop-in' : '',
                outcome && !rolling
                  ? outcome.win
                    ? 'border-success/50'
                    : 'border-destructive/40'
                  : '',
              )}
            >
              <CardHeader>
                <CardTitle>Last round</CardTitle>
              </CardHeader>
              <CardContent>
                {!result || !outcome || rolling ? (
                  <p className="text-sm text-muted-foreground">
                    {rolling
                      ? 'Rolling…'
                      : 'Set a target, choose under or over and roll to see the result here.'}
                  </p>
                ) : (
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Result</dt>
                      <dd
                        className={cn(
                          'text-lg font-semibold',
                          outcome.win ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {outcome.win ? 'Win' : 'Lose'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Rolled</dt>
                      <dd className="font-medium tabular-nums">
                        {outcome.roll.toFixed(2)} ({outcome.direction} {outcome.target})
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Multiplier</dt>
                      <dd className="tabular-nums">
                        {formatMultiplierMilli(outcome.multiplierMilli)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Stake</dt>
                      <dd className="tabular-nums">{formatCredits(result.round.stakeMinor)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Payout</dt>
                      <dd className="tabular-nums">{formatCredits(result.round.payoutMinor)}</dd>
                    </div>
                    <div className="flex justify-between">
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
                    <div className="flex justify-between border-t border-border pt-2">
                      <dt className="text-muted-foreground">New balance</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCredits(result.wallet.balanceMinor)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Round</dt>
                      <dd className="tabular-nums">#{result.round.roundNumber}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
            <SessionRounds rounds={rounds} />
          </div>
        </div>
      </SessionGate>
    </div>
  );
}

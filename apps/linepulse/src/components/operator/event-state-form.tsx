'use client';
import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateEventStateSchema,
  type SportsEventDto,
  type UpdateEventStateInput,
} from '@igaming/contracts';
import { Button, Input, Label } from '@igaming/ui';
import { describeError } from '@/lib/errors';
import { useUpdateEventState } from '@/lib/operator';

export function EventStateForm({ event }: { event: SportsEventDto }) {
  const update = useUpdateEventState();
  const [homeScore, setHomeScore] = React.useState(event.homeScore);
  const [awayScore, setAwayScore] = React.useState(event.awayScore);
  const [clockMinute, setClockMinute] = React.useState(event.clockMinute);
  const [periodLabel, setPeriodLabel] = React.useState(event.periodLabel ?? '');
  const [validation, setValidation] = React.useState<string | null>(null);
  const terminal =
    event.status === 'SETTLED' || event.status === 'CANCELLED' || event.status === 'FINISHED';

  const dirty =
    homeScore !== event.homeScore ||
    awayScore !== event.awayScore ||
    clockMinute !== event.clockMinute ||
    periodLabel !== (event.periodLabel ?? '');

  const send = (input: UpdateEventStateInput, successMessage: string) => {
    const parsed = updateEventStateSchema.safeParse(input);
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Invalid values');
      return;
    }
    setValidation(null);
    update.mutate(
      { id: event.id, input: parsed.data },
      {
        onSuccess: () => toast.success(successMessage),
        onError: (error) => toast.error(describeError(error, 'Could not update the event')),
      },
    );
  };

  const saveState = () =>
    send(
      {
        homeScore,
        awayScore,
        clockMinute,
        periodLabel: periodLabel.trim() === '' ? null : periodLabel.trim(),
      },
      'Match state updated',
    );

  const counter = (label: string, value: number, setValue: (n: number) => void, id: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Decrease ${label} score`}
          onClick={() => setValue(Math.max(0, value - 1))}
          disabled={terminal}
        >
          <Minus />
        </Button>
        <Input
          id={id}
          type="number"
          min={0}
          max={300}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-8 w-16 text-center tabular-nums"
          disabled={terminal}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Increase ${label} score`}
          onClick={() => setValue(Math.min(300, value + 1))}
          disabled={terminal}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );

  return (
    <section
      className="space-y-3 rounded-md border border-border bg-surface p-3"
      aria-label="Match state"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Match state</h4>
        <div className="flex flex-wrap gap-1.5">
          {event.status === 'SCHEDULED' ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                send({ status: 'LIVE', clockMinute: 0, periodLabel: '1H' }, 'Event is now live')
              }
              loading={update.isPending}
            >
              Go live
            </Button>
          ) : null}
          {event.status === 'LIVE' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => send({ status: 'SCHEDULED' }, 'Event moved back to scheduled')}
                disabled={update.isPending}
              >
                Back to scheduled
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => send({ status: 'FINISHED' }, 'Event marked finished')}
                disabled={update.isPending}
              >
                Mark finished
              </Button>
            </>
          ) : null}
          {event.status === 'FINISHED' ? (
            <p className="text-xs text-muted-foreground">Finished. Use “Settle” to pay out bets.</p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counter(event.homeTeam, homeScore, setHomeScore, `home-${event.id}`)}
        {counter(event.awayTeam, awayScore, setAwayScore, `away-${event.id}`)}
        <div className="space-y-1.5">
          <Label htmlFor={`clock-${event.id}`}>Clock (min)</Label>
          <Input
            id={`clock-${event.id}`}
            type="number"
            min={0}
            max={120}
            value={clockMinute}
            onChange={(e) => setClockMinute(Number(e.target.value))}
            className="h-8 tabular-nums"
            disabled={terminal}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`period-${event.id}`}>Period</Label>
          <Input
            id={`period-${event.id}`}
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="1H, 2H, Q3…"
            maxLength={20}
            className="h-8"
            disabled={terminal}
          />
        </div>
      </div>
      {validation ? <p className="text-xs text-destructive">{validation}</p> : null}
      {!terminal ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={saveState} disabled={!dirty} loading={update.isPending}>
            Save score &amp; clock
          </Button>
        </div>
      ) : null}
    </section>
  );
}

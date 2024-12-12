'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { settleEventSchema, type SettleEventInput, type SportsEventDto } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@igaming/ui';
import { describeError } from '@/lib/errors';
import { useSettleEvent } from '@/lib/operator';

interface SettleDialogProps {
  event: SportsEventDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueued: (jobId: string) => void;
}

export function SettleDialog({ event, open, onOpenChange, onQueued }: SettleDialogProps) {
  const settle = useSettleEvent();
  const form = useForm<SettleEventInput>({
    resolver: zodResolver(settleEventSchema),
    defaultValues: { homeScore: event.homeScore, awayScore: event.awayScore },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await settle.mutateAsync({ id: event.id, input: values });
      toast.success('Settlement queued', {
        description: `Job ${result.jobId} is processing ${event.betCount ?? 'the open'} bets.`,
      });
      onQueued(result.jobId);
      onOpenChange(false);
    } catch (error) {
      form.setError('root', { message: describeError(error, 'Could not settle the event') });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Settle {event.homeTeam} vs {event.awayTeam}
          </DialogTitle>
          <DialogDescription>
            Enter the final score. The event is marked finished and the settlement worker pays out
            every open bet asynchronously.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="settle-home">{event.homeTeam}</Label>
              <Input
                id="settle-home"
                type="number"
                min={0}
                max={300}
                inputMode="numeric"
                className="tabular-nums"
                aria-invalid={Boolean(errors.homeScore)}
                {...form.register('homeScore', { valueAsNumber: true })}
              />
              {errors.homeScore ? (
                <p className="text-xs text-destructive">{errors.homeScore.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settle-away">{event.awayTeam}</Label>
              <Input
                id="settle-away"
                type="number"
                min={0}
                max={300}
                inputMode="numeric"
                className="tabular-nums"
                aria-invalid={Boolean(errors.awayScore)}
                {...form.register('awayScore', { valueAsNumber: true })}
              />
              {errors.awayScore ? (
                <p className="text-xs text-destructive">{errors.awayScore.message}</p>
              ) : null}
            </div>
          </div>
          {errors.root ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button type="submit" variant="success" loading={settle.isPending}>
              Settle with this score
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

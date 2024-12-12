'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CasinoGameDto } from '@igaming/contracts';
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
import { toast } from 'sonner';
import { useUpdateGame } from '@/lib/casino-api';
import { formatCredits, minorToInput, parseCreditsInput } from '@/lib/format';
import { describeError } from '@/lib/game-meta';

const creditsField = z.string().refine((value) => {
  const minor = parseCreditsInput(value);
  return minor !== null && BigInt(minor) > 0n;
}, 'Enter a positive amount in credits (up to two decimals)');

const stakeSchema = z
  .object({ minStake: creditsField, maxStake: creditsField })
  .refine(
    (values) =>
      BigInt(parseCreditsInput(values.minStake) ?? '0') <
      BigInt(parseCreditsInput(values.maxStake) ?? '0'),
    { message: 'Maximum stake must be greater than the minimum', path: ['maxStake'] },
  );

type StakeForm = z.infer<typeof stakeSchema>;

export function StakeDialog({
  game,
  open,
  onOpenChange,
}: {
  game: CasinoGameDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateGame();
  const form = useForm<StakeForm>({
    resolver: zodResolver(stakeSchema),
    defaultValues: { minStake: '', maxStake: '' },
  });
  const reset = form.reset;

  React.useEffect(() => {
    if (game && open)
      reset({
        minStake: minorToInput(game.minStakeMinor),
        maxStake: minorToInput(game.maxStakeMinor),
      });
  }, [game, open, reset]);

  const onSubmit = form.handleSubmit((values) => {
    if (!game) return;
    const minStakeMinor = parseCreditsInput(values.minStake);
    const maxStakeMinor = parseCreditsInput(values.maxStake);
    if (!minStakeMinor || !maxStakeMinor) return;
    update.mutate(
      { id: game.id, patch: { minStakeMinor, maxStakeMinor } },
      {
        onSuccess: (updated) => {
          toast.success(
            `${updated.name}: stakes ${formatCredits(updated.minStakeMinor)} – ${formatCredits(updated.maxStakeMinor)}`,
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit stake limits</DialogTitle>
          <DialogDescription>
            {game
              ? `${game.name} currently accepts ${formatCredits(game.minStakeMinor)} to ${formatCredits(game.maxStakeMinor)} per round.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stake-min">Minimum stake (DMO)</Label>
              <Input
                id="stake-min"
                inputMode="decimal"
                aria-invalid={Boolean(errors.minStake)}
                {...form.register('minStake')}
              />
              {errors.minStake ? (
                <p className="text-xs text-destructive">{errors.minStake.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stake-max">Maximum stake (DMO)</Label>
              <Input
                id="stake-max"
                inputMode="decimal"
                aria-invalid={Boolean(errors.maxStake)}
                {...form.register('maxStake')}
              />
              {errors.maxStake ? (
                <p className="text-xs text-destructive">{errors.maxStake.message}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save limits
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

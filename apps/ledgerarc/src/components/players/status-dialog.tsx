'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  PLAYER_STATUSES,
  updatePlayerStatusSchema,
  type PlayerStatus,
  type UpdatePlayerStatusInput,
} from '@igaming/contracts';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@igaming/ui';
import { useUpdatePlayerStatus } from '@/lib/api/admin';
import { PLAYER_STATUS_LABEL } from '@/lib/labels';

const STATUS_HELP: Record<PlayerStatus, string> = {
  ACTIVE: 'Restores full access. Clears any suspension, cooling-off or self-exclusion.',
  SUSPENDED: 'Blocks play and top-ups until an operator reactivates the account.',
  COOLING_OFF: 'Short break chosen by the player. Defaults to 1 day when no duration is given.',
  SELF_EXCLUDED: 'Long exclusion for the given number of days. Blocks sign-in to the player apps.',
  CLOSED: 'Permanently closes the account. Use for compliance-driven offboarding.',
};

const NEEDS_DAYS: PlayerStatus[] = ['COOLING_OFF', 'SELF_EXCLUDED'];

export function ChangeStatusDialog({
  playerId,
  current,
  open,
  onOpenChange,
}: {
  playerId: string;
  current: PlayerStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdatePlayerStatus(playerId);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<UpdatePlayerStatusInput>({
    resolver: zodResolver(updatePlayerStatusSchema),
    defaultValues: { status: current, reason: '', days: undefined },
  });
  const status = useWatch({ control: form.control, name: 'status' });
  const showDays = NEEDS_DAYS.includes(status);

  const close = (next: boolean) => {
    if (!next) {
      form.reset({ status: current, reason: '', days: undefined });
      setServerError(null);
    }
    onOpenChange(next);
  };

  const submit = form.handleSubmit((values) => {
    setServerError(null);
    const payload: UpdatePlayerStatusInput = {
      status: values.status,
      reason: values.reason,
      ...(showDays && values.days ? { days: values.days } : {}),
    };
    update.mutate(payload, {
      onSuccess: () => {
        toast.success(`Status set to ${PLAYER_STATUS_LABEL[values.status]}`);
        close(false);
      },
      onError: (error) => setServerError(error.message),
    });
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change account status</DialogTitle>
          <DialogDescription>
            Currently{' '}
            <span className="font-medium text-foreground">{PLAYER_STATUS_LABEL[current]}</span>. The
            reason is stored on the profile and in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="status-select">New status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                form.setValue('status', value as PlayerStatus, { shouldValidate: true })
              }
            >
              <SelectTrigger id="status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAYER_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PLAYER_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STATUS_HELP[status]}</p>
          </div>
          {showDays ? (
            <div className="space-y-1.5">
              <Label htmlFor="status-days">Duration (days)</Label>
              <Input
                id="status-days"
                type="number"
                min={1}
                max={3650}
                inputMode="numeric"
                placeholder={status === 'COOLING_OFF' ? '1' : '30'}
                aria-invalid={!!form.formState.errors.days}
                {...form.register('days', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
              {form.formState.errors.days ? (
                <p className="text-xs text-destructive">{form.formState.errors.days.message}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="status-reason">Reason</Label>
            <Textarea
              id="status-reason"
              placeholder="Visible to other operators and recorded in the audit log"
              aria-invalid={!!form.formState.errors.reason}
              {...form.register('reason')}
            />
            {form.formState.errors.reason ? (
              <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            ) : null}
          </div>
          {serverError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={update.isPending}
              variant={status === 'ACTIVE' ? 'default' : 'destructive'}
            >
              Apply status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

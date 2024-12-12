'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { KYC_STATUSES, type KycStatus } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@igaming/ui';
import { useUpdateKyc } from '@/lib/api/admin';
import { KYC_LABEL } from '@/lib/labels';

const KYC_HELP: Record<KycStatus, string> = {
  PENDING:
    'Documents not yet reviewed. Play is allowed in the demo, but the account shows as unverified.',
  VERIFIED: 'Identity confirmed. Clears KYC-related review flags.',
  REJECTED: 'Documents failed review. Consider suspending the account and raising a manual alert.',
};

export function SetKycDialog({
  playerId,
  current,
  open,
  onOpenChange,
}: {
  playerId: string;
  current: KycStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateKyc(playerId);
  const [selected, setSelected] = React.useState<KycStatus>(current);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setSelected(current);
      setServerError(null);
    }
    onOpenChange(next);
  };

  const submit = () => {
    setServerError(null);
    update.mutate(selected, {
      onSuccess: () => {
        toast.success(`${KYC_LABEL[selected]}`);
        close(false);
      },
      onError: (error) => setServerError(error.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set KYC status</DialogTitle>
          <DialogDescription>
            Record the outcome of identity verification. The change is audited.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="sr-only">KYC status</legend>
          {KYC_STATUSES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm hover:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                selected === value && 'border-primary bg-brand-soft/60',
              )}
            >
              <input
                type="radio"
                name="kyc"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                <span className="font-medium">{KYC_LABEL[value]}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {KYC_HELP[value]}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
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
            type="button"
            onClick={submit}
            loading={update.isPending}
            disabled={selected === current}
          >
            Save KYC status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

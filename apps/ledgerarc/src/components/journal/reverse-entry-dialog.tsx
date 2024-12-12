'use client';
import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ApiError } from '@igaming/api-client';
import { reverseEntrySchema, type JournalEntryDto } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@igaming/ui';
import { useReverseEntry } from '@/lib/api/admin';
import { JOURNAL_KIND_LABEL } from '@/lib/labels';
import { ShortId } from '@/components/common/short-id';

type ReverseForm = { reason: string };

export function ReverseEntryDialog({
  entry,
  open,
  onOpenChange,
  onReversed,
}: {
  entry: JournalEntryDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReversed?: (reversal: JournalEntryDto) => void;
}) {
  const reverse = useReverseEntry();
  const form = useForm<ReverseForm>({
    resolver: zodResolver(reverseEntrySchema),
    defaultValues: { reason: '' },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(next);
  };

  const submit = form.handleSubmit((values) => {
    if (!entry) return;
    setServerError(null);
    reverse.mutate(
      { id: entry.id, reason: values.reason },
      {
        onSuccess: (reversal) => {
          toast.success('Entry reversed', {
            description: `Reversal entry ${reversal.id.slice(0, 8)} posted.`,
          });
          onReversed?.(reversal);
          close(false);
        },
        onError: (error) =>
          setServerError(
            ApiError.is(error) && error.status === 403
              ? 'Only administrators can reverse journal entries.'
              : error.message,
          ),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse journal entry</DialogTitle>
          <DialogDescription>
            Posts a mirrored entry that undoes every line of this{' '}
            {entry ? JOURNAL_KIND_LABEL[entry.kind].toLowerCase() : 'entry'}. The original stays in
            the journal and is linked to the reversal. This is audited and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {entry ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{entry.description}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              Entry <ShortId value={entry.id} label="entry id" />
              {entry.player ? (
                <>
                  ·{' '}
                  <Link
                    href={`/players/${entry.player.id}`}
                    className="text-primary hover:underline"
                  >
                    {entry.player.displayName}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea
              id="reverse-reason"
              placeholder="Why is this entry being reversed?"
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
              variant="destructive"
              loading={reverse.isPending}
              disabled={!entry}
            >
              Reverse entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

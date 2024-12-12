'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createNoteSchema } from '@igaming/contracts';
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
import { useAddNote } from '@/lib/api/admin';

type NoteForm = { body: string };

export function AddNoteDialog({
  playerId,
  open,
  onOpenChange,
}: {
  playerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addNote = useAddNote(playerId);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<NoteForm>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { body: '' },
  });
  const length = useWatch({ control: form.control, name: 'body' }).length;

  const close = (next: boolean) => {
    if (!next) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(next);
  };

  const submit = form.handleSubmit((values) => {
    setServerError(null);
    addNote.mutate(values.body.trim(), {
      onSuccess: () => {
        toast.success('Note added');
        close(false);
      },
      onError: (error) => setServerError(error.message),
    });
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add internal note</DialogTitle>
          <DialogDescription>
            Visible to operators and admins only. Notes cannot be edited or deleted once saved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              rows={5}
              placeholder="Context for the next person who opens this profile"
              aria-invalid={!!form.formState.errors.body}
              {...form.register('body')}
            />
            <div className="flex justify-between text-xs">
              {form.formState.errors.body ? (
                <p className="text-destructive">{form.formState.errors.body.message}</p>
              ) : (
                <span />
              )}
              <span className="tabular-nums text-muted-foreground">{length}/2000</span>
            </div>
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
            <Button type="submit" loading={addNote.isPending}>
              Save note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';
import {
  ErrorState,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from '@igaming/ui';
import { useJournalEntry } from '@/lib/api/admin';
import { errorMessage } from '@/components/common/list-state';
import { JournalEntryDetails } from './journal-entry-details';

export function JournalEntryDrawer({
  entryId,
  onOpenChange,
  onSelectEntry,
}: {
  entryId: string | null;
  onOpenChange: (open: boolean) => void;
  onSelectEntry?: (id: string) => void;
}) {
  const entry = useJournalEntry(entryId);
  return (
    <Sheet open={entryId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Journal entry</SheetTitle>
          <SheetDescription>
            Double-entry posting behind this transaction. Debits must equal credits.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {entry.isPending ? (
            <div className="space-y-3" aria-busy>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : entry.isError ? (
            <ErrorState message={errorMessage(entry.error)} onRetry={() => void entry.refetch()} />
          ) : (
            <JournalEntryDetails entry={entry.data} onSelectEntry={onSelectEntry} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

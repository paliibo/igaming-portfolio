import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@igaming/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested does not exist in LedgerArc or the record it pointed to has been
          removed.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}

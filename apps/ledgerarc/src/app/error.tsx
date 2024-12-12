'use client';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@igaming/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div
        className="w-full max-w-md rounded-lg border border-destructive/40 bg-card p-6 text-center shadow-sm"
        role="alert"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">ref {error.digest}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

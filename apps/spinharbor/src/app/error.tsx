'use client';
import { ErrorState } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12">
      <ErrorState
        title="Something went wrong on this page"
        message={error.message || 'An unexpected error occurred.'}
        onRetry={reset}
      />
      {error.digest ? (
        <p className="text-center text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
      <div className="flex justify-center">
        <LinkButton variant="outline" href="/">
          Back to home
        </LinkButton>
      </div>
    </div>
  );
}

'use client';
import { ErrorState } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <ErrorState
        title="This page hit an unexpected error"
        message={error.digest ? `Reference ${error.digest}` : error.message}
        onRetry={reset}
      />
      <div className="flex justify-center">
        <LinkButton variant="outline" href="/">
          Back to sportsbook
        </LinkButton>
      </div>
    </div>
  );
}

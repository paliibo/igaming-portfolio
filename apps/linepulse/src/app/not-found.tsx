'use client';
import { Compass } from 'lucide-react';
import { EmptyState } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <div className="flex gap-2">
            <LinkButton href="/">Back to sportsbook</LinkButton>
            <LinkButton variant="outline" href="/sports">
              Browse sports
            </LinkButton>
          </div>
        }
      />
    </div>
  );
}

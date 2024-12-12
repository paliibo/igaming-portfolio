'use client';
import { Compass } from 'lucide-react';
import { EmptyState } from '@igaming/ui';
import { LinkButton } from '@/components/ui/link-button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <EmptyState
        icon={Compass}
        title="Lost at sea"
        description="That page is not on the SpinHarbor map. Head back to the lobby to find a game."
        action={
          <div className="flex gap-2">
            <LinkButton href="/lobby">Open the lobby</LinkButton>
            <LinkButton variant="outline" href="/">
              Home
            </LinkButton>
          </div>
        }
      />
    </div>
  );
}

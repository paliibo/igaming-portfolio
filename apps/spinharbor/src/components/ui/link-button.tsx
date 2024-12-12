import * as React from 'react';
import Link from 'next/link';
import { buttonVariants, cn, type ButtonProps } from '@igaming/ui';

type LinkButtonProps = React.ComponentPropsWithoutRef<typeof Link> &
  Pick<ButtonProps, 'variant' | 'size'>;

/**
 * Anchor styled as a Button. The shared `Button asChild` path breaks under Radix Slot because it
 * renders a loader placeholder next to the child, so links use this component instead.
 */
export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <Link ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
LinkButton.displayName = 'LinkButton';

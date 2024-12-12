import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonVariants, cn } from '@igaming/ui';

type ButtonVariantProps = NonNullable<Parameters<typeof buttonVariants>[0]>;
type LinkButtonProps = ComponentProps<typeof Link> & Pick<ButtonVariantProps, 'variant' | 'size'>;

/** Next.js link styled as a button; the shared Button's `asChild` cannot be used because it always renders a second (null) child. */
export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

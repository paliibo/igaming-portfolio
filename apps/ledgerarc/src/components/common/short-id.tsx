'use client';
import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@igaming/ui';
import { shortId } from '@/lib/format';

export function ShortId({
  value,
  length = 8,
  className,
  label,
}: {
  value: string;
  length?: number;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Clipboard is not available in this browser');
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label ?? 'id'} ${value}`}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded px-1 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
            className,
          )}
        >
          <span className="truncate">{shortId(value, length)}</span>
          {copied ? (
            <Check className="h-3 w-3 text-success" aria-hidden />
          ) : (
            <Copy className="h-3 w-3 opacity-60" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent className="font-mono">{copied ? 'Copied' : value}</TooltipContent>
    </Tooltip>
  );
}

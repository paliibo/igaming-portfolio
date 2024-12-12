import { cn } from '@igaming/ui';

function compact(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.length > 40 ? `${value.slice(0, 37)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  const json = JSON.stringify(value);
  return json.length > 40 ? `${json.slice(0, 37)}…` : json;
}

export function MetadataChips({
  metadata,
  max = 4,
  className,
}: {
  metadata: Record<string, unknown> | null;
  max?: number;
  className?: string;
}) {
  if (!metadata) return <span className="text-muted-foreground">—</span>;
  const entries = Object.entries(metadata);
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  const shown = entries.slice(0, max);
  const rest = entries.length - shown.length;
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {shown.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex max-w-56 items-baseline gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] leading-4"
        >
          <span className="text-muted-foreground">{key}:</span>
          <span className="truncate" title={typeof value === 'string' ? value : undefined}>
            {compact(value)}
          </span>
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
          +{rest} more
        </span>
      ) : null}
    </span>
  );
}

export function JsonView({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        'max-h-80 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-5 scrollbar-thin',
        className,
      )}
    >
      {value === null || value === undefined ? 'null' : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function DetailList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm', className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

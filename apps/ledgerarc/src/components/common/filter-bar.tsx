'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@igaming/ui';

export function FilterBar({
  children,
  onReset,
  isDirty,
  className,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  isDirty?: boolean;
  className?: string;
}) {
  return (
    <div
      role="search"
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      {children}
      {onReset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!isDirty}
          className="h-9"
        >
          <X aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 basis-40 flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export interface DebouncedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: string;
  onValueChange: (value: string) => void;
  delay?: number;
}

/** Controlled text input that reports changes after the user pauses typing. */
export function DebouncedInput({
  value,
  onValueChange,
  delay = 300,
  ...props
}: DebouncedInputProps) {
  const [draft, setDraft] = React.useState(value);
  const [synced, setSynced] = React.useState(value);

  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  React.useEffect(() => {
    if (draft === value) return;
    const handle = window.setTimeout(() => onValueChange(draft), delay);
    return () => window.clearTimeout(handle);
  }, [draft, value, delay, onValueChange]);

  return <Input {...props} value={draft} onChange={(event) => setDraft(event.target.value)} />;
}

export const ALL = 'ALL';

export function FilterSelect({
  id,
  value,
  onValueChange,
  options,
  allLabel = 'All',
  className,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onValueChange(next === ALL ? '' : next)}>
      <SelectTrigger id={id} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  idPrefix = 'date',
}: {
  from: string;
  to: string;
  onChange: (patch: { from?: string; to?: string }) => void;
  idPrefix?: string;
}) {
  return (
    <>
      <FilterField label="From" htmlFor={`${idPrefix}-from`} className="basis-36">
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </FilterField>
      <FilterField label="To" htmlFor={`${idPrefix}-to`} className="basis-36">
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </FilterField>
    </>
  );
}

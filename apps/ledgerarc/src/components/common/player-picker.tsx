'use client';
import * as React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input, cn } from '@igaming/ui';
import { usePlayer, usePlayerSearch } from '@/lib/api/admin';
import { isUuid } from '@/lib/format';

export interface PlayerPickerProps {
  id: string;
  value: string;
  onChange: (playerId: string) => void;
  onPick?: (player: { id: string; email: string; displayName: string }) => void;
  placeholder?: string;
  className?: string;
}

/** Combobox over `/admin/players?search=`: type a name, email or paste a player id. */
export function PlayerPicker({
  id,
  value,
  onChange,
  onPick,
  placeholder = 'Name, email or player id',
  className,
}: PlayerPickerProps) {
  const [term, setTerm] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [debounced, setDebounced] = React.useState('');
  const listId = `${id}-listbox`;

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(term.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [term]);

  const search = usePlayerSearch(debounced, open && debounced.length >= 2 && !isUuid(debounced));
  const selected = usePlayer(value, isUuid(value));
  const results = search.data?.items ?? [];

  const pick = (player: { id: string; email: string; displayName: string }) => {
    onChange(player.id);
    onPick?.(player);
    setTerm('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const trimmed = term.trim();
      if (isUuid(trimmed)) {
        event.preventDefault();
        onChange(trimmed);
        setTerm('');
        setOpen(false);
      } else if (open && results[active]) {
        event.preventDefault();
        pick(results[active]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  if (value) {
    const label = selected.data
      ? `${selected.data.displayName} · ${selected.data.email}`
      : selected.isError
        ? `Unknown player ${value}`
        : value;
    return (
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate" title={label}>
          {selected.isPending ? (
            <Loader2
              className="inline h-3.5 w-3.5 animate-spin text-muted-foreground"
              aria-label="Loading player"
            />
          ) : (
            label
          )}
        </span>
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear player filter"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active] ? `${listId}-${results[active].id}` : undefined
        }
        autoComplete="off"
        className="pl-8"
        placeholder={placeholder}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && debounced.length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
        >
          {isUuid(debounced) ? (
            <li
              role="option"
              aria-selected
              className="rounded-sm px-2 py-1.5 text-muted-foreground"
            >
              Press Enter to filter by id <span className="font-mono text-xs">{debounced}</span>
            </li>
          ) : search.isPending ? (
            <li className="px-2 py-1.5 text-muted-foreground">Searching…</li>
          ) : search.isError ? (
            <li className="px-2 py-1.5 text-destructive">Search failed</li>
          ) : results.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">No players match “{debounced}”</li>
          ) : (
            results.map((player, index) => (
              <li
                key={player.id}
                id={`${listId}-${player.id}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(player)}
                className={cn(
                  'cursor-pointer rounded-sm px-2 py-1.5',
                  index === active && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="font-medium">{player.displayName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{player.email}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

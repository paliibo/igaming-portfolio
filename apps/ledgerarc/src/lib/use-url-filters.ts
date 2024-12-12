'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type FilterValues<K extends string> = Record<K, string>;

export interface UrlFilters<K extends string> {
  values: FilterValues<K>;
  set: (key: K, value: string | undefined) => void;
  setMany: (patch: Partial<Record<K, string | undefined>>) => void;
  reset: () => void;
  isDirty: boolean;
}

const NO_DEFAULTS: Partial<Record<string, string>> = {};

/** Keeps a fixed set of filter keys in the URL search params so views are shareable and survive refresh. */
export function useUrlFilters<K extends string>(
  keys: readonly K[],
  defaults: Partial<Record<K, string>> = NO_DEFAULTS as Partial<Record<K, string>>,
): UrlFilters<K> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = React.useMemo(() => {
    const out = {} as FilterValues<K>;
    for (const key of keys) out[key] = searchParams.get(key) ?? defaults[key] ?? '';
    return out;
  }, [keys, searchParams, defaults]);

  const setMany = React.useCallback(
    (patch: Partial<Record<K, string | undefined>>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
        if (value === undefined || value === '' || value === defaults[key]) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, defaults],
  );

  const set = React.useCallback(
    (key: K, value: string | undefined) =>
      setMany({ [key]: value } as Partial<Record<K, string | undefined>>),
    [setMany],
  );

  const reset = React.useCallback(() => {
    const patch = {} as Partial<Record<K, string | undefined>>;
    for (const key of keys) patch[key] = undefined;
    setMany(patch);
  }, [keys, setMany]);

  const isDirty = keys.some((key) => values[key] !== (defaults[key] ?? ''));

  return { values, set, setMany, reset, isDirty };
}

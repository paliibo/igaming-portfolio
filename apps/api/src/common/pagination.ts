import type { Page } from '@igaming/contracts';

/** Builds a cursor page from a `limit + 1` fetch ordered by (createdAt desc, id desc). */
export function toPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null };
}

export function cursorArgs(cursor: string | undefined, limit: number) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

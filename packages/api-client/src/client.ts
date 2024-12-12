import type { ApiErrorBody } from '@igaming/contracts';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static is(error: unknown, code?: string): error is ApiError {
    return error instanceof ApiError && (code === undefined || error.code === code);
  }
}

export function getApiBaseUrl(): string {
  return (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

/** Cookie-authenticated JSON fetch against the shared NestJS API. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${getApiBaseUrl()}/api${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
    );
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      response.status,
      body.code ?? 'HTTP_ERROR',
      body.message ?? response.statusText,
      body.details,
    );
  }
  return data as T;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

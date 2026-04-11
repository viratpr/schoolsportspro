import { getApiBaseUrl } from './api-base';

export type ApiErrorBody = { error: string; code?: string; details?: unknown };

/** API request failed (non-2xx). Use statusCode/code to handle 401, 404, etc. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ApiErrorPayload = { message: string; statusCode: number; code?: string; details?: unknown };

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

/** Use in queryFn/mutationFn. Prefer a local assertOk in each component so the error overlay points at the component. */
export function unwrap<T>(r: ApiResult<T>): T {
  if (r.ok) return r.data;
  throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
}

async function getToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken !== undefined && cachedTokenExpiresAt > now) {
    return cachedToken;
  }
  if (inflightTokenPromise) {
    return inflightTokenPromise;
  }
  inflightTokenPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      const token = (data?.apiToken as string | null | undefined) ?? null;
      cachedToken = token;
      cachedTokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
      return token;
    } catch {
      cachedToken = null;
      cachedTokenExpiresAt = Date.now() + 2000;
      return null;
    } finally {
      inflightTokenPromise = null;
    }
  })();
  return inflightTokenPromise;
}

/** Browser fetch timeout for /api/rest (Fastify + DB). Serverless cold start + pooler connect can exceed 15s. */
const API_TIMEOUT_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 5000 && n <= 120000) return n;
  }
  return 45000;
})();
const TOKEN_CACHE_TTL_MS = 30000;
let cachedToken: string | null | undefined;
let cachedTokenExpiresAt = 0;
let inflightTokenPromise: Promise<string | null> | null = null;

/** Returns result object; does not throw. Use unwrap() in queryFn if you want React Query to see the error. */
export async function api<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<ApiResult<T>> {
  const base = getApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      error: {
        message:
          'API base URL is not configured. Set NEXT_PUBLIC_API_URL or deploy on Vercel with /api/rest.',
        statusCode: 0,
      },
    };
  }
  const { params, ...init } = options;
  const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const pathForAuth = url.pathname;
  const skipTokenLookup =
    pathForAuth.includes('/auth/login') ||
    pathForAuth.includes('/auth/signup') ||
    pathForAuth.includes('/auth/forgot-password') ||
    pathForAuth.includes('/auth/reset-password') ||
    pathForAuth.includes('/public/');
  const token = skipTokenLookup ? null : await getToken();
  const hasBody = init.body != null && init.body !== '';
  const headers: HeadersInit = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), { ...init, headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg =
      err instanceof Error && err.name === 'AbortError'
        ? (() => {
            const local =
              typeof window !== 'undefined' &&
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (local) {
              return `Request timed out after ${API_TIMEOUT_MS / 1000}s. Is the API running at ${base}? Start it with: pnpm --filter @bharatathlete/api dev`;
            }
            return `Request timed out after ${API_TIMEOUT_MS / 1000}s. On Vercel, /api/rest may be cold-starting or waiting on Postgres—check Deployment → Logs, DATABASE_URL (Supabase pooler :6543, pgbouncer=true), and function duration limits.`;
          })()
        : err instanceof Error
          ? err.message
          : 'Network error';
    return { ok: false, error: { message: msg, statusCode: 0 } };
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as ApiErrorBody;
    const message =
      (typeof data?.error === 'string' ? data.error : null) ??
      (res.statusText || `Request failed (${res.status})`);
    return { ok: false, error: { message, statusCode: res.status, code: data?.code, details: data?.details } };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  const data = await res.json().catch(() => ({})) as T;
  return { ok: true, data };
}

export const apiGet = <T>(path: string, params?: Record<string, string>) =>
  api<T>(path, { method: 'GET', params });
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });

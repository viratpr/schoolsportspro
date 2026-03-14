const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
  const res = await fetch('/api/auth/session', { cache: 'no-store' });
  const data = await res.json();
  return data?.apiToken ?? null;
}

const API_TIMEOUT_MS = 15000;

/** Returns result object; does not throw. Use unwrap() in queryFn if you want React Query to see the error. */
export async function api<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<ApiResult<T>> {
  const { params, ...init } = options;
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const token = await getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), { ...init, headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error && err.name === 'AbortError'
      ? `Request timed out. Is the API running at ${API_BASE}?`
      : (err instanceof Error ? err.message : 'Network error');
    return { ok: false, error: { message: msg, statusCode: 0 } };
  }
  clearTimeout(timeoutId);

  const data = await res.json().catch(() => ({})) as ApiErrorBody | T;
  if (!res.ok) {
    const body = data as ApiErrorBody;
    const message =
      (typeof body?.error === 'string' ? body.error : null) ??
      (res.statusText || `Request failed (${res.status})`);
    return { ok: false, error: { message, statusCode: res.status, code: body?.code, details: body?.details } };
  }
  return { ok: true, data: data as T };
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

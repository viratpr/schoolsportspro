/**
 * Base URL for the Fastify REST API (HTTP calls from browser or Next server).
 *
 * - Set `NEXT_PUBLIC_API_URL` to override (e.g. `http://127.0.0.1:3001` for local two-process dev,
 *   or `https://your-domain.com/api/rest` for an explicit single-origin deploy).
 * - If unset: dev uses :3001; production browser uses same origin + `/api/rest`; production
 *   serverless uses `https://${VERCEL_URL}/api/rest` when `VERCEL_URL` is set.
 */
export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:3001';
  if (typeof window !== 'undefined') return `${window.location.origin}/api/rest`;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}/api/rest`;
  return null;
}

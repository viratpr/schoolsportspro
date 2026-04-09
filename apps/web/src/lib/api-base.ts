/**
 * Base URL for the Fastify REST API (HTTP calls from browser or Next server).
 *
 * - Set `NEXT_PUBLIC_API_URL` to override (e.g. `http://127.0.0.1:3001` for local two-process dev,
 *   or `https://your-domain.com/api/rest` for an explicit single-origin deploy).
 * - If unset: dev uses :3001; production browser uses same origin + `/api/rest`; production
 *   serverless uses `https://${VERCEL_URL}/api/rest` when `VERCEL_URL` is set.
 * - On Vercel (`VERCEL=1`), a `NEXT_PUBLIC_API_URL` pointing at localhost is ignored so login
 *   does not try to reach your laptop from the server (common mis-copy from .env).
 */
function isLoopbackApiHost(base: string): boolean {
  try {
    const u = new URL(base);
    const h = u.hostname.toLowerCase();
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h === '[::1]' ||
      h === '::1'
    );
  } catch {
    return false;
  }
}

export function getApiBaseUrl(): string | null {
  const onVercel = process.env.VERCEL === '1';
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const fromEnv = raw ? raw.replace(/\/+$/, '') : '';
  if (fromEnv && !(onVercel && isLoopbackApiHost(fromEnv))) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === 'development' && !onVercel) {
    return 'http://127.0.0.1:3001';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/rest`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}/api/rest`;
  return null;
}

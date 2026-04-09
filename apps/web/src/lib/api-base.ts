/**
 * Base URL for the Fastify REST API (HTTP calls from browser or Next server).
 *
 * - Set `NEXT_PUBLIC_API_URL` to override (e.g. `http://127.0.0.1:3001` for local two-process dev,
 *   or `https://your-domain.com/api/rest` for an explicit single-origin deploy).
 * - If unset: dev uses :3001; production browser uses same origin + `/api/rest`; production
 *   serverless uses `https://${VERCEL_URL}/api/rest` when `VERCEL_URL` is set.
 * - Loopback `NEXT_PUBLIC_API_URL` is ignored (1) on the server when `VERCEL=1`, and (2) in the
 *   browser when the page is not served from localhost — `VERCEL` is not available in client
 *   bundles, so we key off `window.location.hostname` for signup and other client fetches.
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
  const onVercelServer = process.env.VERCEL === '1';
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const fromEnv = raw ? raw.replace(/\/+$/, '') : '';

  const browserOnDeployedHost =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  if (fromEnv) {
    const ignoreLoopbackEnv =
      (onVercelServer && isLoopbackApiHost(fromEnv)) ||
      (browserOnDeployedHost && isLoopbackApiHost(fromEnv));
    if (!ignoreLoopbackEnv) {
      return fromEnv;
    }
  }

  if (process.env.NODE_ENV === 'development' && !onVercelServer) {
    return 'http://127.0.0.1:3001';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/rest`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}/api/rest`;
  return null;
}

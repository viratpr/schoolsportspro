/**
 * Runtime environment reads for server-only code (Node route handlers).
 *
 * Prefer `import { env } from 'node:process'` so reads hit the real OS environment
 * the Node process was started with (Docker, Vercel, PM2, etc.).
 *
 * We still avoid `process.env.FOO` literal member access for custom keys so webpack
 * cannot substitute build-time values for those names.
 */
import { env as nodeEnv } from 'node:process';

export function readServerEnv(key: string): string | undefined {
  const raw = nodeEnv[key];
  if (raw === undefined) return undefined;
  const t = String(raw).trim();
  return t === '' ? undefined : t;
}

/** Which standard names have a non-empty value (no secret values; safe for JSON errors). */
const RAZORPAY_FLAG_KEYS = [
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_SECRET',
  /** Common in Helm / SOPS YAML secret data keys when mirrored into env without remapping. */
  'razorpay_key_id',
  'razorpay_key_secret',
] as const;

export function razorpayEnvPresence(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of RAZORPAY_FLAG_KEYS) {
    out[k] = readServerEnv(k) !== undefined;
  }
  return out;
}

export function razorpayKeyId(): string | undefined {
  return (
    readServerEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID') ??
    readServerEnv('RAZORPAY_KEY_ID') ??
    readServerEnv('razorpay_key_id')
  );
}

/** Supports `RAZORPAY_SECRET` — a common typo / alternate name in hosting dashboards. */
export function razorpayKeySecret(): string | undefined {
  return (
    readServerEnv('RAZORPAY_KEY_SECRET') ??
    readServerEnv('RAZORPAY_SECRET') ??
    readServerEnv('razorpay_key_secret')
  );
}

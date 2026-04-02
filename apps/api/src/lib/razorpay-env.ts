import { env as nodeEnv } from 'node:process';

function readEnv(key: string): string | undefined {
  const raw = nodeEnv[key];
  if (raw === undefined) return undefined;
  const t = String(raw).trim();
  return t === '' ? undefined : t;
}

const RAZORPAY_FLAG_KEYS = [
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_SECRET',
  'razorpay_key_id',
  'razorpay_key_secret',
] as const;

export function razorpayEnvPresence(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of RAZORPAY_FLAG_KEYS) {
    out[k] = readEnv(k) !== undefined;
  }
  return out;
}

export function razorpayKeyId(): string | undefined {
  return readEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID') ?? readEnv('RAZORPAY_KEY_ID') ?? readEnv('razorpay_key_id');
}

export function razorpayKeySecret(): string | undefined {
  return readEnv('RAZORPAY_KEY_SECRET') ?? readEnv('RAZORPAY_SECRET') ?? readEnv('razorpay_key_secret');
}

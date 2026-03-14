import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CLEAR_SESSION_COOKIES = [
  'next-auth.session-token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
  '__Secure-next-auth.session-token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure',
];

function clearSessionAndReturnNull() {
  const res = Response.json({ user: null, apiToken: null });
  CLEAR_SESSION_COOKIES.forEach((cookie) => {
    res.headers.append('Set-Cookie', cookie);
  });
  return res;
}

function isJwtDecryptionError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'JWEDecryptionFailed') return true;
    if (err.message?.includes('decryption')) return true;
  }
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'JWEDecryptionFailed'
  );
}

export async function GET() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    if (isJwtDecryptionError(err)) {
      return clearSessionAndReturnNull();
    }
    throw err;
  }
  const out = session
    ? {
        user: session.user,
        apiToken: (session as { apiToken?: string }).apiToken ?? null,
      }
    : { user: null, apiToken: null };
  return Response.json(out);
}

import { getApiBaseUrl } from './api-base';
import { getSupabaseAuthClient } from './supabase-auth-env';

export type AuthLoginUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  apiToken: string;
};

// In Vercel serverless cold starts + DB pool waits can exceed 15s.
const AUTH_FETCH_TIMEOUT_MS = 45000;

type DirectLoginFallbackResult =
  | { ok: true; user: AuthLoginUser }
  | { ok: false; code: 'USER_NOT_FOUND' | 'NO_APP_PASSWORD' | 'INVALID_PASSWORD' };

/** Short message in production; full detail in logs (Vercel / terminal). */
function throwLoginError(userFacing: string, diagnostic: string): never {
  console.error('[auth-login]', diagnostic);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(userFacing);
  }
  throw new Error(`${userFacing}\n\n${diagnostic}`);
}

function parseAppLoginFailure(loginText: string): { message: string; code?: string } {
  try {
    const json = JSON.parse(loginText) as { error?: string; code?: string };
    return {
      message: typeof json.error === 'string' ? json.error : 'Invalid email or password',
      code: typeof json.code === 'string' ? json.code : undefined,
    };
  } catch {
    return { message: 'Invalid email or password' };
  }
}

/** Supabase uses this string for wrong email/password or missing user. */
function isSupabaseGenericCredentialError(message: string): boolean {
  return /invalid login credentials|invalid email or password/i.test(message.trim());
}

/** When false, login uses only /auth/login (helps when Vercel DATABASE_URL ≠ DB you seeded). */
function supabaseLoginFallbackEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function mapLoginPayload(data: {
  token: string;
  user: { id: string; email: string; name: string; role: string; tenantId: string | null };
}): AuthLoginUser {
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    role: data.user.role,
    tenantId: data.user.tenantId,
    apiToken: data.token,
  };
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function signApiJwt(payload: {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
}): Promise<string> {
  const secret = process.env.JWT_SECRET ?? 'change-me-in-production';
  const { createHmac } = await import('node:crypto');
  const nowSec = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: nowSec,
    exp: nowSec + 7 * 24 * 60 * 60,
  };
  const headerPart = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadPart = base64url(JSON.stringify(body));
  const signature = createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${headerPart}.${payloadPart}.${signature}`;
}

/**
 * Temporary Vercel safety net: if the internal /api/rest auth call times out, verify password
 * directly against the same Postgres and mint the same API JWT shape expected by the app.
 */
async function tryServerDirectLoginFallback(
  email: string,
  password: string
): Promise<DirectLoginFallbackResult | null> {
  if (typeof window !== 'undefined') return null;
  if (process.env.VERCEL !== '1') return null;

  const [{ PrismaClient }, { Prisma }] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/client'),
  ]);
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return { ok: false, code: 'USER_NOT_FOUND' };
    if (!user.passwordHash) return { ok: false, code: 'NO_APP_PASSWORD' };

    const rows = await prisma.$queryRaw<{ ok: boolean }[]>(
      Prisma.sql`select crypt(${password}, ${user.passwordHash}) = ${user.passwordHash} as ok`
    );
    const ok = rows[0]?.ok === true;
    if (!ok) return { ok: false, code: 'INVALID_PASSWORD' };

    const token = await signApiJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? null,
    });
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId ?? null,
        apiToken: token,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * App DB password first; if that fails and Supabase env is set, Supabase Auth then /auth/supabase-bridge.
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<AuthLoginUser> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    throw new Error(
      'Cannot resolve API base URL. Set NEXT_PUBLIC_API_URL or deploy on Vercel with /api/rest.'
    );
  }
  const allowSb = supabaseLoginFallbackEnabled();

  // On Vercel server, prefer direct DB auth first to avoid waiting for a slow /api/rest hop.
  if (typeof window === 'undefined' && process.env.VERCEL === '1' && !allowSb) {
    const direct = await tryServerDirectLoginFallback(email, password);
    if (direct?.ok) return direct.user;
    if (direct?.code === 'NO_APP_PASSWORD') {
      throwLoginError(
        'This account has no password in the school app. Use your school’s sign-in link or reset your password.',
        'Direct DB login indicates NO_APP_PASSWORD.'
      );
    }
    if (direct?.code === 'USER_NOT_FOUND') {
      throwLoginError(
        'Sign-in failed. There is no school account for this email, or the password is wrong.',
        'Direct DB login indicates USER_NOT_FOUND.'
      );
    }
    if (direct?.code === 'INVALID_PASSWORD') {
      throwLoginError(
        'Sign-in failed. Wrong email or password for this school account.',
        'Direct DB login indicates INVALID_PASSWORD.'
      );
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  let loginRes: Response;
  try {
    loginRes = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const fallback = await tryServerDirectLoginFallback(email, password);
    if (fallback?.ok) return fallback.user;

    const isDev = process.env.NODE_ENV === 'development';
    const hint = isDev
      ? 'Start the API: pnpm dev:api or pnpm dev. If it uses another port, set NEXT_PUBLIC_API_URL in apps/web/.env.local (e.g. http://127.0.0.1:3010).'
      : 'Confirm NEXT_PUBLIC_API_URL or Vercel /api/rest routing is correct, then redeploy.';
    const msg =
      err instanceof Error && err.name === 'AbortError'
        ? `Auth API did not respond in time (${apiBase}). ${hint}`
        : `Cannot reach auth API at ${apiBase}. ${hint}`;
    console.error('[auth] Login API failed at', apiBase, err);
    throw new Error(msg);
  }

  const loginText = await loginRes.text();
  clearTimeout(timeoutId);

  if (loginRes.ok) {
    const data = JSON.parse(loginText) as {
      token: string;
      user: { id: string; email: string; name: string; role: string; tenantId: string | null };
    };
    return mapLoginPayload(data);
  }

  const appFail = parseAppLoginFailure(loginText);

  const supabase = allowSb ? getSupabaseAuthClient() : null;
  if (supabase) {
    const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (sbErr) {
      const sbMsg =
        sbErr.message ||
        'Supabase sign-in failed. Check the password, confirm the email in Supabase if required, and ensure the anon/publishable key matches your project.';
      if (appFail.code === 'NO_APP_PASSWORD') {
        throwLoginError(
          'This account has no password in the school app. Use your school’s sign-in link or reset your password.',
          `${sbMsg} ${appFail.message}`
        );
      }
      if (isSupabaseGenericCredentialError(sbMsg)) {
        if (appFail.code === 'USER_NOT_FOUND') {
          throwLoginError(
            'Sign-in failed. There is no school account for this email, or the password is wrong.',
            `${sbMsg} No User row in the app database for this email (check spelling, run migrations/seed, or sign up). Supabase Auth password is separate—reset in the Supabase dashboard if needed. Bridge still requires a matching app User row.`
          );
        }
        if (appFail.code === 'INVALID_PASSWORD') {
          throwLoginError(
            'Sign-in failed. Wrong email or password for this school account.',
            `${sbMsg} App DB rejected the password. On Vercel, DATABASE_URL must be the Postgres where you ran pnpm db:seed (demo: admin@demoschool.local / School@1234). Supabase sign-in was also tried and failed. Set NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false to test app login only.`
          );
        }
        const apiHint =
          appFail.code != null
            ? `API returned code "${appFail.code}" (HTTP ${loginRes.status}).`
            : loginRes.status === 401
              ? 'API returned HTTP 401 without a login code (wrong API route, non-JSON body, or old deploy). Server-side Vercel login uses VERCEL_URL + /api/rest; confirm DATABASE_URL matches the seeded database.'
              : `API returned HTTP ${loginRes.status} with no login code (response not JSON or old API).`;
        throwLoginError(
          'Sign-in failed. Check your email and password. If you deploy this app, confirm DATABASE_URL points to your seeded database and redeploy.',
          `${sbMsg} School app login failed first. ${apiHint} Match NEXT_PUBLIC_SUPABASE_* to your project or set NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false.`
        );
      }
      throwLoginError(
        'Sign-in failed. Try again or contact support.',
        sbMsg
      );
    }
    if (sbData.session?.access_token) {
      const bridgeController = new AbortController();
      const bridgeTimeout = setTimeout(() => bridgeController.abort(), AUTH_FETCH_TIMEOUT_MS);
      let bridgeRes: Response;
      try {
        bridgeRes = await fetch(`${apiBase}/auth/supabase-bridge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: sbData.session.access_token }),
          signal: bridgeController.signal,
        });
      } catch (bridgeErr) {
        clearTimeout(bridgeTimeout);
        const msg =
          bridgeErr instanceof Error && bridgeErr.name === 'AbortError'
            ? `Supabase bridge timed out (${apiBase}).`
            : `Cannot reach auth API for Supabase bridge (${apiBase}).`;
        throw new Error(msg);
      }
      clearTimeout(bridgeTimeout);
      const bridgeText = await bridgeRes.text();
      if (bridgeRes.ok) {
        const data = JSON.parse(bridgeText) as {
          token: string;
          user: { id: string; email: string; name: string; role: string; tenantId: string | null };
        };
        return mapLoginPayload(data);
      }
      let message = 'Invalid email or password';
      try {
        const json = JSON.parse(bridgeText) as { error?: string; code?: string };
        if (typeof json.error === 'string') message = json.error;
      } catch {
        // keep default
      }
      throw new Error(message);
    }
    throw new Error(
      'Supabase did not return a session. If email confirmation is required, confirm your email in the Supabase Auth settings.'
    );
  }

  const { message } = parseAppLoginFailure(loginText);
  const detailSb = !allowSb
    ? 'Supabase fallback is off (NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false).'
    : 'Supabase was not configured (add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) so only app DB login ran.';
  const parsed = parseAppLoginFailure(loginText);
  const apiDiagnostic =
    parsed.code != null
      ? `API returned code "${parsed.code}" (HTTP ${loginRes.status}).`
      : loginRes.status === 401
        ? 'API returned HTTP 401 without a login code (wrong API route, non-JSON body, or old deploy). Server-side Vercel login uses VERCEL_URL + /api/rest.'
        : `API returned HTTP ${loginRes.status} with no login code.`;

  if (loginRes.status >= 500) {
    throwLoginError(
      'Sign-in service is temporarily unavailable. Please try again shortly.',
      `${message} Prisma /auth/login returned server error. ${apiDiagnostic} On Vercel, confirm DATABASE_URL and that /api/rest/auth/login does not time out. ${detailSb}`
    );
  }

  throwLoginError(
    'Sign-in failed. Wrong email or password, or this account is not in the school database.',
    `${message} Prisma /auth/login rejected this login. ${apiDiagnostic} On Vercel, DATABASE_URL must be the Postgres where you ran pnpm db:seed. ${detailSb}`
  );
}

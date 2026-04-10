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

const AUTH_FETCH_TIMEOUT_MS = 15000;

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

  const supabase = supabaseLoginFallbackEnabled() ? getSupabaseAuthClient() : null;
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
        throw new Error(`${sbMsg} ${appFail.message}`);
      }
      if (isSupabaseGenericCredentialError(sbMsg)) {
        if (appFail.code === 'USER_NOT_FOUND') {
          throw new Error(
            `${sbMsg} There is no user in the school database for this email (check spelling, run seed/migrations on this database, or sign up). If the user exists only in Supabase Auth, the password must match that user—reset it under Authentication → Users in the Supabase dashboard. After Supabase sign-in succeeds, you still need a matching row in the app User table (same email) for the bridge to finish.`
          );
        }
        if (appFail.code === 'INVALID_PASSWORD') {
          throw new Error(
            `${sbMsg} The app database rejected the password for this email. On Vercel, DATABASE_URL must point at the same Postgres where you ran pnpm db:seed (demo: admin@demoschool.local / School@1234). Supabase Auth was also tried and failed—its password is separate; reset under Authentication → Users if you use Supabase. To debug app-only login, set NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false.`
          );
        }
        // Legacy UNAUTHORIZED, missing/unknown code, or 401 body not parsed
        throw new Error(
          `${sbMsg} The school database login failed first. On Vercel, set DATABASE_URL to the same database you seeded locally, then redeploy the API. Then verify demo admin@demoschool.local / School@1234. Supabase keys must be for the project where your Auth user exists. Or set NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false to test app login only.`
        );
      }
      throw new Error(sbMsg);
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
  const allowSb = supabaseLoginFallbackEnabled();
  let suffix =
    ' The school app database rejected this login (Prisma /auth/login). On Vercel set DATABASE_URL to the same Postgres where you ran pnpm db:seed, redeploy, then try admin@demoschool.local / School@1234.';
  if (!allowSb) {
    suffix += ' Supabase fallback is off (NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK=false).';
  } else {
    suffix +=
      ' Supabase was not tried—add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (Settings → API) on Vercel if you want a second sign-in step after app login fails.';
  }
  throw new Error(`${message}${suffix}`);
}

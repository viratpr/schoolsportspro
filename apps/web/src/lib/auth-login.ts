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

  const supabase = getSupabaseAuthClient();
  if (supabase) {
    const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (sbErr) {
      throw new Error(
        sbErr.message ||
          'Supabase sign-in failed. Check the password, confirm the email in Supabase if required, and ensure the anon/publishable key matches your project.'
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

  let message = 'Invalid email or password';
  try {
    const json = JSON.parse(loginText) as { error?: string; code?: string };
    if (typeof json.error === 'string') message = json.error;
  } catch {
    // keep default
  }
  throw new Error(
    `${message} If you use Supabase Auth, set NEXT_PUBLIC_SUPABASE_URL and the JWT anon key from Supabase (Settings → API) on Vercel, and ensure a row exists in table "User" with the same email.`
  );
}

import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/** Base URL for server-side calls to the Fastify API (NextAuth authorize runs on the server). */
function resolveApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  // Empty string is a common .env mistake; ?? alone does not fall through for ""
  if (raw) return raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') {
    // Prefer 127.0.0.1 in dev to avoid slow IPv6 localhost resolution on Windows
    return 'http://127.0.0.1:3001';
  }
  // Hosted production: localhost is never valid from Vercel's servers — require explicit URL
  return null;
}

const API_BASE_URL = resolveApiBaseUrl();
// Use a fixed secret in development so encrypt (callback) and decrypt (session) never mismatch
const NEXTAUTH_SECRET =
  process.env.NODE_ENV === 'production'
    ? (process.env.NEXTAUTH_SECRET ?? '')
    : 'dev-secret-change-in-production';

const AUTH_FETCH_TIMEOUT_MS = 15000;

export const authOptions = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!API_BASE_URL) {
          throw new Error(
            'NEXT_PUBLIC_API_URL is not set. For a deployed site, add it under your host (e.g. Vercel → Project → Settings → Environment Variables) to your public API URL (https://…), then redeploy the web app.'
          );
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timeoutId);
          const isDev = process.env.NODE_ENV === 'development';
          const hint = isDev
            ? 'Start the API: pnpm dev:api or pnpm dev. If it uses another port, set NEXT_PUBLIC_API_URL in apps/web/.env.local (e.g. http://127.0.0.1:3010).'
            : 'Confirm NEXT_PUBLIC_API_URL points to your live API (https), not localhost, and redeploy the web app after env changes.';
          const msg =
            err instanceof Error && err.name === 'AbortError'
              ? `Auth API did not respond in time (${API_BASE_URL}). ${hint}`
              : `Cannot reach auth API at ${API_BASE_URL}. ${hint}`;
          console.error('[auth] Login API failed at', API_BASE_URL, err);
          throw new Error(msg);
        }
        clearTimeout(timeoutId);
        if (!res.ok) {
          const text = await res.text();
          let message = 'Invalid email or password';
          try {
            const json = JSON.parse(text) as { error?: string; code?: string };
            if (typeof json.error === 'string') message = json.error;
          } catch {
            // use default message
          }
          throw new Error(message);
        }
        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          tenantId: data.user.tenantId,
          apiToken: data.token,
        } as { id: string; email: string; name: string; role: string; tenantId: string | null; apiToken: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: string; tenantId?: string | null; apiToken?: string };
        token.userId = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
        token.apiToken = u.apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).userId = token.userId;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).tenantId = token.tenantId;
      }
      (session as unknown as Record<string, unknown>).apiToken = token.apiToken;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: NEXTAUTH_SECRET,
} as AuthOptions;

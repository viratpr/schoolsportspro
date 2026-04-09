import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getApiBaseUrl } from './api-base';
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
        const apiBase = getApiBaseUrl();
        if (!apiBase) {
          throw new Error(
            'Cannot resolve API base URL. Set NEXT_PUBLIC_API_URL (e.g. https://your-domain.com/api/rest), or deploy on Vercel so VERCEL_URL is available for same-origin /api/rest.'
          );
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${apiBase}/auth/login`, {
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
            : 'Confirm NEXT_PUBLIC_API_URL or Vercel /api/rest routing is correct, then redeploy.';
          const msg =
            err instanceof Error && err.name === 'AbortError'
              ? `Auth API did not respond in time (${apiBase}). ${hint}`
              : `Cannot reach auth API at ${apiBase}. ${hint}`;
          console.error('[auth] Login API failed at', apiBase, err);
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

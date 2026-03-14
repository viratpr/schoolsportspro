import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Prefer 127.0.0.1 in dev to avoid slow IPv6 localhost resolution on Windows
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3001' : 'http://localhost:3001');
// Use a fixed secret in development so encrypt (callback) and decrypt (session) never mismatch
const NEXTAUTH_SECRET =
  process.env.NODE_ENV === 'production'
    ? (process.env.NEXTAUTH_SECRET ?? '')
    : 'dev-secret-change-in-production';

const AUTH_FETCH_TIMEOUT_MS = 15000;

export const authOptions: AuthOptions = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            signal: controller.signal,
          });
        } catch (err) {
          clearTimeout(timeoutId);
          const msg = err instanceof Error && err.name === 'AbortError'
            ? 'Auth server did not respond in time. Is the API running (pnpm dev:api)?'
            : 'Auth server unreachable. Start the API with: pnpm dev:api';
          console.error('[auth] Login API failed at', API_URL, err);
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
};

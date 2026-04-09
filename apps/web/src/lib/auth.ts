import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { loginWithEmailPassword } from './auth-login';

// Use a fixed secret in development so encrypt (callback) and decrypt (session) never mismatch
const NEXTAUTH_SECRET =
  process.env.NODE_ENV === 'production'
    ? (process.env.NEXTAUTH_SECRET ?? '')
    : 'dev-secret-change-in-production';

export const authOptions = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        try {
          return await loginWithEmailPassword(email, credentials.password);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Invalid email or password';
          throw new Error(msg);
        }
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

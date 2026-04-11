import jwt from 'jsonwebtoken';

/** HS256 JWT body — must match Fastify @fastify/jwt and auth-login minting. */
export type ApiJwtPayload = {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
  iat: number;
  exp: number;
};

/**
 * Verifies the app API JWT (same secret and HS256 as Fastify `app.jwt.sign` and `signApiJwt` in auth-login).
 */
export function verifyApiJwt(token: string, secret: string): ApiJwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload & {
      email?: string;
      role?: string;
      tenantId?: string | null;
    };
    if (typeof decoded.sub !== 'string') return null;
    if (typeof decoded.email !== 'string') return null;
    if (typeof decoded.role !== 'string') return null;
    if (typeof decoded.iat !== 'number' || typeof decoded.exp !== 'number') return null;
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId ?? null,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

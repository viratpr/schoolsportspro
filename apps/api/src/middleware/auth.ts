import type { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@bharatathlete/db';
import { forbidden } from '../lib/errors.js';

type JwtPayload = { sub: string; tenantId?: string | null; role: Role; email: string };

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as JwtPayload;
    (request as FastifyRequest & { user: { userId: string; tenantId: string | null; role: Role; email: string } }).user = {
      userId: payload.sub,
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
}

export function requirePlatformAdmin(request: FastifyRequest, _reply: FastifyReply) {
  const u = (request as FastifyRequest & { user: { role: Role } }).user;
  if (u.role !== Role.PLATFORM_ADMIN) {
    throw forbidden('Platform admin access required');
  }
}

export function requireTenantAccess(request: FastifyRequest, tenantId: string) {
  const u = (request as FastifyRequest & { user: { role: Role; tenantId: string | null } }).user;
  if (u.role === Role.PLATFORM_ADMIN) return;
  if (u.tenantId !== tenantId) {
    throw forbidden('Access denied to this tenant');
  }
}

export function requireRole(request: FastifyRequest, allowed: Role[]) {
  const u = (request as FastifyRequest & { user: { role: Role } }).user;
  if (u.role === Role.PLATFORM_ADMIN) return;
  if (!allowed.includes(u.role)) {
    throw forbidden('Insufficient role');
  }
}

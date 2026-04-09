import type { Role } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      tenantId: string | null;
      role: Role;
      email: string;
    };
  }
}

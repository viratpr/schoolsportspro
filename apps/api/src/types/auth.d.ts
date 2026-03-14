import { Role } from '@bharatathlete/db';

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

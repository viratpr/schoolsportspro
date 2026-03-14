import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import { Role } from '@bharatathlete/db';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/dashboard-summary',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

      const [
        studentsCount,
        competitionsCount,
        categoriesCount,
        participantsCount,
        matchesTotal,
        matchesCompleted,
        publicCompetitionsCount,
      ] = await Promise.all([
        prisma.student.count({ where: { tenantId, active: true } }),
        prisma.competition.count({ where: { tenantId } }),
        prisma.category.count({ where: { tenantId } }),
        prisma.participantEntry.count({ where: { tenantId } }),
        prisma.match.count({ where: { tenantId } }),
        prisma.match.count({ where: { tenantId, status: 'COMPLETED' } }),
        prisma.competition.count({ where: { tenantId, NOT: { shareToken: null } } }),
      ]);

      return reply.send({
        studentsCount,
        competitionsCount,
        categoriesCount,
        participantsCount,
        matchesTotal,
        matchesCompleted,
        publicCompetitionsCount,
      });
    }
  );
}


import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam, matchIdParam } from '../schemas/common.js';
import { notFound } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';

export default async function matchesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params as { matchId: string });
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const match = await prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              format: true,
              competitionSport: {
                select: {
                  sport: {
                    select: {
                      id: true,
                      name: true,
                      scoringModel: true,
                      matchConfigJson: true,
                    },
                  },
                },
              },
            },
          },
          teamA: {
            select: {
              id: true,
              name: true,
              coachName: true,
              members: {
                include: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          teamB: {
            select: {
              id: true,
              name: true,
              coachName: true,
              members: {
                include: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          scorecard: true,
          result: { include: { winnerTeam: { select: { id: true, name: true } } } },
        },
      });
      if (!match) throw notFound('Match not found');
      return reply.send(match);
    }
  );
}

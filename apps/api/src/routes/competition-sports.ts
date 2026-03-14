import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { enableSportSchema } from '../schemas/tenant.js';
import { tenantIdParam, competitionIdParam, competitionSportIdParam } from '../schemas/common.js';
import { notFound, badRequest } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';
import { getTenantEntitlements, getEnabledSportsCountForCompetition } from '../lib/entitlements.js';

export default async function competitionSportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string; competitionSportId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionSportId } = competitionSportIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const cs = await prisma.competitionSport.findFirst({
        where: { id: competitionSportId, tenantId },
        include: {
          sport: true,
          competition: { select: { id: true, name: true, academicYear: true } },
        },
      });
      if (!cs) throw notFound('Competition sport not found');
      return reply.send(cs);
    }
  );

  app.get<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId/sports',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionId } = competitionIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const comp = await prisma.competition.findFirst({ where: { id: competitionId, tenantId } });
      if (!comp) throw notFound('Competition not found');
      const list = await prisma.competitionSport.findMany({
        where: { tenantId, competitionId },
        include: { sport: { select: { id: true, name: true, sportType: true, scoringModel: true } } },
      });
      return reply.send({ data: list });
    }
  );

  app.post<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId/sports',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionId } = competitionIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const comp = await prisma.competition.findFirst({ where: { id: competitionId, tenantId } });
      if (!comp) throw notFound('Competition not found');
      const body = enableSportSchema.parse(request.body);
      const sport = await prisma.sport.findUnique({ where: { id: body.sportId } });
      if (!sport) throw notFound('Sport not found');
      const existing = await prisma.competitionSport.findFirst({
        where: { competitionId, sportId: body.sportId, tenantId },
      });
      if (existing) {
        const updated = await prisma.competitionSport.update({
          where: { id: existing.id },
          data: { enabled: body.enabled, overriddenRulesText: body.overriddenRulesText },
        });
        return reply.send(updated);
      }
      if (body.enabled) {
        const entitlements = await getTenantEntitlements(tenantId);
        if (!entitlements.canUseAllSports) {
          const enabledCount = await getEnabledSportsCountForCompetition(tenantId, competitionId);
          if (enabledCount >= entitlements.sportsEnabledLimit) {
            return reply.status(402).send({
              error: 'Upgrade to Pro to enable more sports.',
              code: 'PLAN_LIMIT_REACHED',
              limit: entitlements.sportsEnabledLimit,
            });
          }
        }
      }
      const cs = await prisma.competitionSport.create({
        data: {
          tenantId,
          competitionId,
          sportId: body.sportId,
          enabled: body.enabled,
          overriddenRulesText: body.overriddenRulesText,
          templateSnapshotJson: (sport.scorecardTemplateJson ?? undefined) as object | undefined,
          templateVersion: sport.templateVersion ?? undefined,
        },
      });
      return reply.status(201).send(cs);
    }
  );
}

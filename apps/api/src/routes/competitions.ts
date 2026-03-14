import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { logAudit } from '../lib/audit.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { createCompetitionSchema, updateCompetitionSchema } from '../schemas/tenant.js';
import { tenantIdParam } from '../schemas/common.js';
import { notFound } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';

export default async function competitionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/competitions',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const cursor = (request.query as { cursor?: string }).cursor;
      const limit = Math.min(Math.max(Number((request.query as { limit?: string }).limit) || 20, 1), 100);
      const list = await prisma.competition.findMany({
        where: { tenantId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          academicYear: true,
          startDate: true,
          endDate: true,
          venue: true,
          status: true,
          createdAt: true,
        },
      });
      const nextCursor = list.length > limit ? list[limit - 1]?.id : null;
      return reply.send({ data: list.slice(0, limit), nextCursor });
    }
  );

  app.post<{ Params: { tenantId: string } }>('/tenants/:tenantId/competitions', async (request, reply) => {
    const { tenantId } = tenantIdParam.parse(request.params);
    requireTenantAccess(request, tenantId);
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
    const body = createCompetitionSchema.parse(request.body);
    const competition = await prisma.competition.create({
      data: {
        ...body,
        tenantId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        venue: body.venue && body.venue.trim() ? body.venue.trim() : undefined,
      },
    });
    const userId = (request as { user?: { userId: string } }).user?.userId;
    if (userId) {
      await logAudit(prisma, {
        tenantId,
        actorUserId: userId,
        action: 'COMPETITION_CREATE',
        entityType: 'Competition',
        entityId: competition.id,
        metaJson: { name: competition.name, academicYear: competition.academicYear },
      });
    }
    return reply.status(201).send(competition);
  });

  app.get<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const competitionId = (request.params as { competitionId: string }).competitionId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const competition = await prisma.competition.findFirst({
        where: { id: competitionId, tenantId },
      });
      if (!competition) throw notFound('Competition not found');
      return reply.send(competition);
    }
  );

  app.patch<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const competitionId = (request.params as { competitionId: string }).competitionId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const body = updateCompetitionSchema.parse(request.body);
      const competition = await prisma.competition.update({
        where: { id: competitionId },
        data: {
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      });
      if (competition.tenantId !== tenantId) throw notFound('Competition not found');
      return reply.send(competition);
    }
  );

  app.delete<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const competitionId = (request.params as { competitionId: string }).competitionId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const c = await prisma.competition.findFirst({ where: { id: competitionId, tenantId } });
      if (!c) throw notFound('Competition not found');
      await prisma.competition.delete({ where: { id: competitionId } });
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId/enable-public-view',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const competitionId = (request.params as { competitionId: string }).competitionId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const c = await prisma.competition.findFirst({ where: { id: competitionId, tenantId } });
      if (!c) throw notFound('Competition not found');
      const shareToken = randomBytes(21).toString('base64url');
      await prisma.competition.update({
        where: { id: competitionId },
        data: { shareToken },
      });
      const baseUrl = (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-host'])
        ? `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}`
        : process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/live/${shareToken}`;
      return reply.send({ shareToken, publicUrl });
    }
  );

  app.post<{ Params: { tenantId: string; competitionId: string } }>(
    '/tenants/:tenantId/competitions/:competitionId/disable-public-view',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const competitionId = (request.params as { competitionId: string }).competitionId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const c = await prisma.competition.findFirst({ where: { id: competitionId, tenantId } });
      if (!c) throw notFound('Competition not found');
      await prisma.competition.update({
        where: { id: competitionId },
        data: { shareToken: null },
      });
      return reply.send({ enabled: false });
    }
  );
}

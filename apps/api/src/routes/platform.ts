import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requirePlatformAdmin, requireTenantAccess, verifyJWT } from '../middleware/auth.js';
import { createTenantSchema, updateTenantSchema, createSportSchema, updateSportSchema } from '../schemas/platform.js';
import { notFound, badRequest } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';

export default async function platformRoutes(app: FastifyInstance) {
  const preHandler = [verifyJWT];

  app.addHook('preHandler', async (request, reply) => {
    for (const h of preHandler) await (h as (r: FastifyRequest, re: FastifyReply) => Promise<void>)(request, reply);
  });

  app.get('/platform/tenants', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const { cursor, limit } = parseCursor(request);
    const list = await prisma.tenant.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, city: true, state: true, logoUrl: true, createdAt: true },
    });
    const nextCursor = list.length > limit ? list[limit - 1]?.id : null;
    return reply.send({ data: list.slice(0, limit), nextCursor });
  });

  app.post('/platform/tenants', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const body = createTenantSchema.parse(request.body);
    const tenant = await prisma.tenant.create({ data: body });
    return reply.status(201).send(tenant);
  });

  app.get<{ Params: { tenantId: string } }>('/platform/tenants/:tenantId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const tenant = await prisma.tenant.findUnique({ where: { id: request.params.tenantId } });
    if (!tenant) throw notFound('Tenant not found');
    return reply.send(tenant);
  });

  app.patch<{ Params: { tenantId: string } }>('/platform/tenants/:tenantId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const body = updateTenantSchema.parse(request.body);
    const tenant = await prisma.tenant.update({
      where: { id: request.params.tenantId },
      data: body,
    });
    return reply.send(tenant);
  });

  app.delete<{ Params: { tenantId: string } }>('/platform/tenants/:tenantId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    await prisma.tenant.delete({ where: { id: request.params.tenantId } });
    return reply.status(204).send();
  });

  app.get('/sports', async (request, reply) => {
    const { cursor, limit } = parseCursor(request);
    const list = await prisma.sport.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sportType: true,
        scoringModel: true,
        defaultRulesText: true,
        defaultCategoryTemplatesJson: true,
        teamConfigJson: true,
        matchConfigJson: true,
        createdAt: true,
      },
    });
    const nextCursor = list.length > limit ? list[limit - 1]?.id : null;
    return reply.send({ data: list.slice(0, limit), nextCursor });
  });

  app.get('/platform/sports', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const { cursor, limit } = parseCursor(request);
    const list = await prisma.sport.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sportType: true,
        scoringModel: true,
        defaultRulesText: true,
        defaultCategoryTemplatesJson: true,
        teamConfigJson: true,
        matchConfigJson: true,
        createdAt: true,
      },
    });
    const nextCursor = list.length > limit ? list[limit - 1]?.id : null;
    return reply.send({ data: list.slice(0, limit), nextCursor });
  });

  app.post('/platform/sports', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const body = createSportSchema.parse(request.body);
    const sport = await prisma.sport.create({
      data: {
        ...body,
        defaultCategoryTemplatesJson: body.defaultCategoryTemplatesJson as object,
        teamConfigJson: body.teamConfigJson as object ?? undefined,
        matchConfigJson: (body.matchConfigJson ?? {}) as object,
      },
    });
    return reply.status(201).send(sport);
  });

  app.get<{ Params: { sportId: string } }>('/platform/sports/:sportId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const sport = await prisma.sport.findUnique({ where: { id: request.params.sportId } });
    if (!sport) throw notFound('Sport not found');
    return reply.send(sport);
  });

  app.patch<{ Params: { sportId: string } }>('/platform/sports/:sportId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const body = updateSportSchema.parse(request.body);
    const existing = await prisma.sport.findUnique({ where: { id: request.params.sportId } });
    if (!existing) throw notFound('Sport not found');
    // Validate the effective scoring model + config pair even for partial updates.
    createSportSchema.parse({
      name: body.name ?? existing.name,
      sportType: body.sportType ?? existing.sportType,
      scoringModel: body.scoringModel ?? existing.scoringModel,
      defaultRulesText: body.defaultRulesText ?? existing.defaultRulesText,
      defaultCategoryTemplatesJson: (body.defaultCategoryTemplatesJson ?? existing.defaultCategoryTemplatesJson) as unknown[],
      teamConfigJson: (body.teamConfigJson ?? existing.teamConfigJson) as Record<string, unknown> | null | undefined,
      matchConfigJson: (body.matchConfigJson ?? existing.matchConfigJson ?? {}) as Record<string, unknown>,
    });
    const sport = await prisma.sport.update({
      where: { id: request.params.sportId },
      data: {
        ...body,
        defaultCategoryTemplatesJson: body.defaultCategoryTemplatesJson as object | undefined,
        teamConfigJson: body.teamConfigJson as object | undefined,
        matchConfigJson: body.matchConfigJson as object | undefined,
      },
    });
    return reply.send(sport);
  });

  app.delete<{ Params: { sportId: string } }>('/platform/sports/:sportId', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    await prisma.sport.delete({ where: { id: request.params.sportId } });
    return reply.status(204).send();
  });
}

function parseCursor(request: FastifyRequest) {
  const q = request.query as { cursor?: string; limit?: number };
  return {
    cursor: q.cursor ?? undefined,
    limit: Math.min(Math.max(Number(q.limit) || 20, 1), 100),
  };
}

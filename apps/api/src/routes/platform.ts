import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requirePlatformAdmin, requireTenantAccess, verifyJWT } from '../middleware/auth.js';
import { createTenantSchema, updateTenantSchema, createSportSchema, updateSportSchema } from '../schemas/platform.js';
import { notFound, badRequest } from '../lib/errors.js';
import { Prisma, Role } from '@bharatathlete/db';

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
    const list = await listSportsPage(cursor, limit);
    const nextCursor = list.length > limit ? list[limit - 1]?.id : null;
    return reply.send({ data: list.slice(0, limit), nextCursor });
  });

  app.get('/platform/sports', async (request, reply) => {
    requirePlatformAdmin(request, reply);
    const { cursor, limit } = parseCursor(request);
    const list = await listSportsPage(cursor, limit);
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

async function listSportsPage(cursor: string | undefined, limit: number) {
  const baseArgs = {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { name: 'asc' as const },
  };

  try {
    const list = await prisma.sport.findMany({
      ...baseArgs,
      select: {
        id: true,
        name: true,
        sportType: true,
        scoringModel: true,
        defaultRulesText: true,
        defaultCategoryTemplatesJson: true,
        teamConfigJson: true,
        matchConfigJson: true,
        hasInternationalRules: true,
        createdAt: true,
      },
    });
    return list.map((sport) => ({
      ...sport,
      hasInternationalRules: sport.hasInternationalRules || inferHasInternationalRulesByName(sport.name),
    }));
  } catch (error) {
    // Backward-safe read path for environments pending dual-scoring migration.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      const fallback = await prisma.sport.findMany({
        ...baseArgs,
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
      return fallback.map((sport) => ({
        ...sport,
        hasInternationalRules: inferHasInternationalRulesByName(sport.name),
      }));
    }
    throw error;
  }
}

function inferHasInternationalRulesByName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  const known = new Set([
    'basketball',
    'soccer',
    'volleyball',
    'baseball/softball',
    'baseball',
    'softball',
    'tennis',
    'wrestling',
    'track & field 100m',
    'track and field 100m',
    'athletics 100m',
    'swimming 50m freestyle',
  ]);
  return known.has(normalized);
}

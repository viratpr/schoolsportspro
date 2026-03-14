import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import {
  createMatchSchema,
  updateMatchSchema,
  updateInningsSchema,
  finalizeSchema,
  cricketMatchIdParam,
  inningsNumberParam,
} from '../schemas/cricket.js';
import { notFound, badRequest } from '../lib/errors.js';
import { Role, CricketMatchStatus } from '@bharatathlete/db';
import { createMatch, updateInnings, finalize } from '../services/cricket.js';

const CRICKET_ROLES = [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER];

const LOCKED_STATUSES: CricketMatchStatus[] = [
  CricketMatchStatus.COMPLETED,
  CricketMatchStatus.TBD,
  CricketMatchStatus.NO_RESULT,
  CricketMatchStatus.ABANDONED,
];

function requireCricketEdit(request: import('fastify').FastifyRequest, status: CricketMatchStatus) {
  const locked = LOCKED_STATUSES.includes(status);
  if (locked) {
    const u = (request as import('fastify').FastifyRequest & { user: { role: Role } }).user;
    if (u.role !== Role.PLATFORM_ADMIN) {
      throw badRequest('Match is finalized; only platform admin can edit');
    }
  }
}

export default async function cricketRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.post<{ Params: { tenantId: string }; Body: unknown }>(
    '/tenants/:tenantId/cricket/matches',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const body = createMatchSchema.parse(request.body);
      try {
        const match = await prisma.$transaction((tx) => createMatch(tx, tenantId, body));
        return reply.status(201).send(match);
      } catch (err) {
        request.log.error(err);
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('CricketMatch') || msg.includes('CricketInnings') || msg.includes('does not exist') || msg.includes('Unknown arg')) {
          return reply.status(503).send({
            error: 'Cricket tables are not set up. Run database migrations (e.g. pnpm db:migrate).',
            code: 'MIGRATION_REQUIRED',
          });
        }
        throw err;
      }
    }
  );

  app.get<{ Params: { tenantId: string }; Querystring: { competitionId?: string; categoryId?: string } }>(
    '/tenants/:tenantId/cricket/matches',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const { competitionId, categoryId } = request.query;
      const where: { tenantId: string; competitionId?: string; categoryId?: string } = { tenantId };
      if (competitionId) where.competitionId = competitionId;
      if (categoryId) where.categoryId = categoryId;
      const list = await prisma.cricketMatch.findMany({
        where,
        include: {
          teamA: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          teamB: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          innings: {
            orderBy: { inningsNumber: 'asc' },
            include: {
              battingTeam: { select: { id: true, name: true } },
              bowlingTeam: { select: { id: true, name: true } },
            },
          },
          competition: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ data: list });
    }
  );

  app.get<{ Params: { tenantId: string; id: string } }>(
    '/tenants/:tenantId/cricket/matches/:id',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { id } = cricketMatchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const match = await prisma.cricketMatch.findFirst({
        where: { id, tenantId },
        include: {
          teamA: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          teamB: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          innings: {
            orderBy: { inningsNumber: 'asc' },
            include: {
              battingTeam: { select: { id: true, name: true } },
              bowlingTeam: { select: { id: true, name: true } },
            },
          },
          competition: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });
      if (!match) throw notFound('Cricket match not found');
      return reply.send(match);
    }
  );

  app.put<{ Params: { tenantId: string; id: string }; Body: unknown }>(
    '/tenants/:tenantId/cricket/matches/:id',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { id } = cricketMatchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const existing = await prisma.cricketMatch.findFirst({ where: { id, tenantId } });
      if (!existing) throw notFound('Cricket match not found');
      requireCricketEdit(request, existing.status);
      if (existing.status !== CricketMatchStatus.SCHEDULED) {
        throw badRequest('Only scheduled matches can be updated');
      }
      const body = updateMatchSchema.parse(request.body);
      const scheduledAtValue =
        body.scheduledAt !== undefined
          ? body.scheduledAt == null
            ? null
            : typeof body.scheduledAt === 'string'
              ? new Date(body.scheduledAt)
              : body.scheduledAt
          : undefined;
      const match = await prisma.cricketMatch.update({
        where: { id },
        data: {
          ...(body.oversLimit != null && { oversLimit: body.oversLimit }),
          ...(body.ballsPerOver != null && { ballsPerOver: body.ballsPerOver }),
          ...(body.tossWinnerTeamId != null && { tossWinnerTeamId: body.tossWinnerTeamId }),
          ...(body.tossDecision != null && { tossDecision: body.tossDecision as 'BAT' | 'BOWL' }),
          ...(body.notes !== undefined && { notes: body.notes ?? null }),
          ...(body.scheduledAt !== undefined && { scheduledAt: scheduledAtValue }),
        },
        include: {
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
          innings: {
            orderBy: { inningsNumber: 'asc' },
            include: {
              battingTeam: { select: { id: true, name: true } },
              bowlingTeam: { select: { id: true, name: true } },
            },
          },
          competition: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });
      return reply.send(match);
    }
  );

  app.put<{ Params: { tenantId: string; id: string; inningsNumber: string }; Body: unknown }>(
    '/tenants/:tenantId/cricket/matches/:id/innings/:inningsNumber',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { id } = cricketMatchIdParam.parse(request.params);
      const { inningsNumber } = inningsNumberParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const existing = await prisma.cricketMatch.findFirst({ where: { id, tenantId } });
      if (!existing) throw notFound('Cricket match not found');
      requireCricketEdit(request, existing.status);
      const body = updateInningsSchema.parse(request.body);
      const innings = await prisma.$transaction((tx) =>
        updateInnings(tx, tenantId, id, inningsNumber as 1 | 2, body)
      );
      return reply.send(innings);
    }
  );

  app.post<{ Params: { tenantId: string; id: string }; Body: unknown }>(
    '/tenants/:tenantId/cricket/matches/:id/finalize',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { id } = cricketMatchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, CRICKET_ROLES);
      const body = finalizeSchema.parse(request.body);
      const userId = (request as { user?: { userId: string } }).user?.userId ?? '';
      const match = await prisma.$transaction((tx) => finalize(tx, tenantId, id, body, userId));
      return reply.send(match);
    }
  );
}

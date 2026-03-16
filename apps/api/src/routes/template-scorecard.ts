import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam, matchIdParam } from '../schemas/common.js';
import { templateScorecardPutBodySchema } from '../schemas/scorecard.js';
import { notFound, badRequest, forbidden } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';
import type { Prisma } from '@bharatathlete/db';
import { parseTemplateSafe } from '../lib/templates/validator.js';
import type {
  SportScorecardTemplate,
  PlayerStatLineInput,
  VolleyballTemplatePayload,
  VolleyballPlayerStats,
} from '../lib/templates/types.js';
import { validatePayload, compute } from '../lib/score-engine/index.js';
import { logAudit } from '../lib/audit.js';

/**
 * Base response shape for template-driven scorecards.
 *
 * For volleyball template scorecards (sportKey = "volleyball", scoringModel = "SETS"),
 * - template.match.constraints describes set rules (bestOfSets, setPoints, decidingSetPoints, winBy, maxPointsCap).
 * - matchScorecard.payloadJson SHOULD conform to VolleyballTemplatePayload when the sport is volleyball.
 */
export interface TemplateScorecardResponse<TPayload = Record<string, unknown>> {
  match: {
    id: string;
    teamAId: string | null;
    teamBId: string | null;
    teamAName: string | null;
    teamBName: string | null;
    status: string;
  };
  template: SportScorecardTemplate;
  templateVersion: number;
  matchScorecard: {
    id: string;
    status: string;
    payloadJson: TPayload;
    computedJson: Record<string, unknown> | null;
    summaryA: string;
    summaryB: string;
    winnerTeamId: string | null;
  } | null;
  roster: {
    teamA: { studentId: string; fullName: string; admissionNo: string }[];
    teamB: { studentId: string; fullName: string; admissionNo: string }[];
  };
}

/**
 * Concrete API contracts for volleyball template scorecards.
 *
 * These types describe the recommended payload and player stat shapes for:
 * - PUT /tenants/:tenantId/matches/:matchId/template-scorecard
 * - POST /tenants/:tenantId/matches/:matchId/template-scorecard/finalize
 * when the match uses the volleyball template.
 */
export type VolleyballTemplateScorecardResponse = TemplateScorecardResponse<VolleyballTemplatePayload>;

export interface TemplateScorecardPutBody<TPayload = Record<string, unknown>, TPlayerStats = Record<string, unknown>> {
  payloadJson: TPayload;
  playerLines?: {
    teamId: string;
    studentId?: string | null;
    playerName?: string | null;
    stats: TPlayerStats;
  }[];
}

export type VolleyballTemplateScorecardPutBody = TemplateScorecardPutBody<VolleyballTemplatePayload, VolleyballPlayerStats>;

export default async function templateScorecardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string; matchId: string }; Reply: TemplateScorecardResponse }>(
    '/tenants/:tenantId/matches/:matchId/template-scorecard',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const match = await prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              competitionSport: {
                select: {
                  templateSnapshotJson: true,
                  templateVersion: true,
                  sport: { select: { name: true, sportType: true } },
                },
              },
            },
          },
          teamA: {
            select: {
              id: true,
              name: true,
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
              members: {
                include: {
                  student: { select: { id: true, fullName: true, admissionNo: true } },
                },
              },
            },
          },
          matchScorecard: true,
        },
      });
      if (!match) throw notFound('Match not found');
      const snapshot = match.category.competitionSport.templateSnapshotJson;
      if (!snapshot || typeof snapshot !== 'object') {
        return reply.status(404).send({
          error: 'Template scorecard not available for this match. Use legacy scorecard or enable a sport with a scorecard template.',
        });
      }
      const template = parseTemplateSafe(snapshot);
      if (!template) throw badRequest('Invalid scorecard template for this competition sport.');
      return reply.send({
        match: {
          id: match.id,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          teamAName: match.teamA?.name ?? null,
          teamBName: match.teamB?.name ?? null,
          status: match.status,
        },
        template,
        templateVersion: match.category.competitionSport.templateVersion ?? 1,
        matchScorecard: match.matchScorecard
          ? {
              id: match.matchScorecard.id,
              status: match.matchScorecard.status,
              payloadJson: match.matchScorecard.payloadJson,
              computedJson: match.matchScorecard.computedJson,
              summaryA: match.matchScorecard.summaryA,
              summaryB: match.matchScorecard.summaryB,
              winnerTeamId: match.matchScorecard.winnerTeamId,
            }
          : null,
        roster: {
          teamA: match.teamA?.members?.map((m) => ({ studentId: m.student.id, fullName: m.student.fullName, admissionNo: m.student.admissionNo })) ?? [],
          teamB: match.teamB?.members?.map((m) => ({ studentId: m.student.id, fullName: m.student.fullName, admissionNo: m.student.admissionNo })) ?? [],
        },
      });
    }
  );

  app.put<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId/template-scorecard',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const match = await prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          category: {
            include: {
              competitionSport: { include: { sport: true } },
            },
          },
        },
      });
      if (!match) throw notFound('Match not found');
      const snapshot = match.category.competitionSport.templateSnapshotJson;
      const template = snapshot && typeof snapshot === 'object' ? parseTemplateSafe(snapshot) : null;
      if (!template) throw badRequest('Template scorecard not configured for this match.');
      const body = templateScorecardPutBodySchema.parse(request.body);
      const teamAId = match.teamAId ?? '';
      const teamBId = match.teamBId ?? '';
      const playerLines: PlayerStatLineInput[] = (body.playerLines ?? []).map((l) => ({
        teamId: l.teamId,
        studentId: l.studentId ?? null,
        playerName: l.playerName ?? null,
        stats: l.stats,
      }));
      try {
        validatePayload(template as SportScorecardTemplate, body.payloadJson, playerLines);
      } catch (err) {
        throw badRequest(err instanceof Error ? err.message : 'Validation failed');
      }
      const computed = compute(
        template as SportScorecardTemplate,
        body.payloadJson,
        playerLines,
        teamAId,
        teamBId
      );
      const templateVersion = match.category.competitionSport.templateVersion ?? match.category.competitionSport.sport.templateVersion ?? 1;
      const existing = await prisma.matchScorecard.findUnique({ where: { matchId } });
      if (existing?.status === 'FINAL') throw forbidden('Scorecard is finalized; cannot update.');
      const scorecard = await prisma.matchScorecard.upsert({
        where: { matchId },
        create: {
          tenantId,
          matchId,
          templateVersion,
          status: 'DRAFT',
          payloadJson: body.payloadJson as object,
          computedJson: computed as object,
          summaryA: computed.summaryA,
          summaryB: computed.summaryB,
          winnerTeamId: computed.winnerTeamId,
        },
        update: {
          payloadJson: body.payloadJson as object,
          computedJson: computed as object,
          summaryA: computed.summaryA,
          summaryB: computed.summaryB,
          winnerTeamId: computed.winnerTeamId,
        },
      });
      await upsertPlayerStatLines(prisma, tenantId, matchId, playerLines);
      return reply.send({ scorecard, computed });
    }
  );

  app.post<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId/template-scorecard/finalize',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const userId = (request as { user: { userId: string } }).user.userId;
      const match = await prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          category: {
            include: {
              competitionSport: { include: { sport: true } },
            },
          },
          teamA: { select: { id: true } },
          teamB: { select: { id: true } },
        },
      });
      if (!match) throw notFound('Match not found');
      const snapshot = match.category.competitionSport.templateSnapshotJson;
      const template = snapshot && typeof snapshot === 'object' ? parseTemplateSafe(snapshot) : null;
      if (!template) throw badRequest('Template scorecard not configured for this match.');
      const body = templateScorecardPutBodySchema.parse(request.body);
      const teamAId = match.teamAId ?? '';
      const teamBId = match.teamBId ?? '';
      const playerLines: PlayerStatLineInput[] = (body.playerLines ?? []).map((l) => ({
        teamId: l.teamId,
        studentId: l.studentId ?? null,
        playerName: l.playerName ?? null,
        stats: l.stats,
      }));
      try {
        validatePayload(template as SportScorecardTemplate, body.payloadJson, playerLines);
      } catch (err) {
        throw badRequest(err instanceof Error ? err.message : 'Validation failed');
      }
      const computed = compute(
        template as SportScorecardTemplate,
        body.payloadJson,
        playerLines,
        teamAId,
        teamBId
      );
      const templateVersion = match.category.competitionSport.templateVersion ?? match.category.competitionSport.sport.templateVersion ?? 1;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const ms = await tx.matchScorecard.upsert({
          where: { matchId },
          create: {
            tenantId,
            matchId,
            templateVersion,
            status: 'FINAL',
            payloadJson: body.payloadJson as object,
            computedJson: computed as object,
            summaryA: computed.summaryA,
            summaryB: computed.summaryB,
            winnerTeamId: computed.winnerTeamId,
            finalizedAt: new Date(),
            finalizedByUserId: userId,
          },
          update: {
            status: 'FINAL',
            payloadJson: body.payloadJson as object,
            computedJson: computed as object,
            summaryA: computed.summaryA,
            summaryB: computed.summaryB,
            winnerTeamId: computed.winnerTeamId,
            finalizedAt: new Date(),
            finalizedByUserId: userId,
          },
        });
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            winnerTeamId: computed.winnerTeamId,
          },
        });
        if (computed.winnerTeamId) {
          await tx.matchResult.upsert({
            where: { matchId },
            create: {
              tenantId,
              matchId,
              winnerTeamId: computed.winnerTeamId,
              method: 'NORMAL',
              finalizedByUserId: userId,
            },
            update: {
              winnerTeamId: computed.winnerTeamId,
            },
          });
        }
        await upsertPlayerStatLines(tx, tenantId, matchId, playerLines);
        await logAudit(tx, {
          tenantId,
          actorUserId: userId,
          action: 'SCORECARD_FINALIZE',
          entityType: 'MatchScorecard',
          entityId: ms.id,
          metaJson: { matchId, winnerTeamId: computed.winnerTeamId },
        });
      });
      return reply.send({ ok: true, winnerTeamId: computed.winnerTeamId, summaryA: computed.summaryA, summaryB: computed.summaryB });
    }
  );
}

async function upsertPlayerStatLines(
  db: Prisma.TransactionClient | import('@bharatathlete/db').PrismaClient,
  tenantId: string,
  matchId: string,
  playerLines: PlayerStatLineInput[]
): Promise<void> {
  await db.playerStatLine.deleteMany({ where: { matchId, tenantId } });
  for (const line of playerLines) {
    await db.playerStatLine.create({
      data: {
        tenantId,
        matchId,
        teamId: line.teamId,
        studentId: line.studentId ?? undefined,
        playerName: line.playerName ?? undefined,
        statsJson: line.stats as object,
      },
    });
  }
}

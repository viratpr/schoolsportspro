import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  addParticipantSchema,
  bulkParticipantsSchema,
  bulkResultsSchema,
  finalizeMatchSchema,
  studentSearchSchema,
} from '../schemas/tenant.js';
import { scorecardUpsertBodySchema } from '../schemas/scorecard.js';
import {
  tenantIdParam,
  competitionSportIdParam,
  categoryIdParam,
  matchIdParam,
} from '../schemas/common.js';
import { notFound, conflict, badRequest } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';
import type { Prisma } from '@bharatathlete/db';
import { generateKnockoutBracket, finalizeMatch } from '../services/bracket.js';
import { normalizeScorecardByModel } from '../services/scorecard.js';

export default async function categoriesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string; competitionSportId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionSportId } = competitionSportIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const list = await prisma.category.findMany({
        where: { tenantId, competitionSportId },
        select: {
          id: true,
          name: true,
          gender: true,
          format: true,
          eligibilityJson: true,
          createdAt: true,
        },
      });
      return reply.send({ data: list });
    }
  );

  const fromTemplatesSchema = z.object({
    templateIndices: z.array(z.number().int().min(0)),
  });
  app.post<{ Params: { tenantId: string; competitionSportId: string }; Body: { templateIndices: number[] } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories/from-templates',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionSportId } = competitionSportIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const cs = await prisma.competitionSport.findFirst({
        where: { id: competitionSportId, tenantId },
        include: { sport: true },
      });
      if (!cs) throw notFound('Competition sport not found');
      const body = fromTemplatesSchema.parse(request.body);
      const templates = (cs.sport.defaultCategoryTemplatesJson as Array<{ name: string; gender: string; eligibility?: object; matchFormat?: string }>) ?? [];
      const format = cs.sport.sportType === 'TEAM' ? 'KNOCKOUT' : 'INDIVIDUAL';
      const created: { id: string; name: string }[] = [];
      for (const i of body.templateIndices) {
        if (i >= templates.length) continue;
        const t = templates[i];
        const category = await prisma.category.create({
          data: {
            tenantId,
            competitionSportId,
            name: t.name,
            gender: (t.gender ?? 'OPEN') as 'BOYS' | 'GIRLS' | 'MIXED' | 'OPEN',
            eligibilityJson: (t.eligibility ?? {}) as object,
            format,
          },
        });
        created.push({ id: category.id, name: category.name });
      }
      return reply.status(201).send({ created });
    }
  );

  app.post<{ Params: { tenantId: string; competitionSportId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionSportId } = competitionSportIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const cs = await prisma.competitionSport.findFirst({
        where: { id: competitionSportId, tenantId },
      });
      if (!cs) throw notFound('Competition sport not found');
      const body = createCategorySchema.parse(request.body);
      const category = await prisma.category.create({
        data: {
          tenantId,
          competitionSportId,
          name: body.name,
          gender: body.gender as 'BOYS' | 'GIRLS' | 'MIXED' | 'OPEN',
          eligibilityJson: body.eligibilityJson as object,
          format: body.format as 'KNOCKOUT' | 'INDIVIDUAL',
        },
      });
      return reply.status(201).send(category);
    }
  );

  app.get<{ Params: { tenantId: string; competitionSportId: string; categoryId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories/:categoryId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId },
        include: { competitionSport: { include: { sport: true, competition: true } }, stats: true },
      });
      if (!category) throw notFound('Category not found');
      return reply.send(category);
    }
  );

  app.patch<{ Params: { tenantId: string; competitionSportId: string; categoryId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories/:categoryId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const body = updateCategorySchema.parse(request.body);
      const category = await prisma.category.update({
        where: { id: categoryId },
        data: {
          ...body,
          gender: body.gender as 'BOYS' | 'GIRLS' | 'MIXED' | 'OPEN' | undefined,
          eligibilityJson: body.eligibilityJson as object | undefined,
          format: body.format as 'KNOCKOUT' | 'INDIVIDUAL' | undefined,
        },
      });
      if (category.tenantId !== tenantId) throw notFound('Category not found');
      return reply.send(category);
    }
  );

  app.delete<{ Params: { tenantId: string; competitionSportId: string; categoryId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId/categories/:categoryId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const c = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!c) throw notFound('Category not found');
      await prisma.category.delete({ where: { id: categoryId } });
      return reply.status(204).send();
    }
  );

  // Teams
  app.get<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const list = await prisma.team.findMany({
        where: { categoryId, tenantId },
        select: { id: true, name: true, coachName: true, _count: { select: { members: true } } },
      });
      return reply.send({ data: list });
    }
  );

  app.post<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const body = createTeamSchema.parse(request.body);
      const existing = await prisma.team.findUnique({
        where: { tenantId_categoryId_name: { tenantId, categoryId, name: body.name } },
      });
      if (existing) throw conflict('Team name already exists in this category');
      const team = await prisma.team.create({
        data: { tenantId, categoryId, name: body.name, coachName: body.coachName },
      });
      return reply.status(201).send(team);
    }
  );

  app.get<{ Params: { tenantId: string; categoryId: string; teamId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const team = await prisma.team.findFirst({
        where: { id: teamId, categoryId, tenantId },
        include: { members: { include: { student: true } } },
      });
      if (!team) throw notFound('Team not found');
      return reply.send(team);
    }
  );

  app.get<{
    Params: { tenantId: string; categoryId: string; teamId: string };
    Querystring: Record<string, string>;
  }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId/available-students',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const team = await prisma.team.findFirst({ where: { id: teamId, categoryId, tenantId } });
      if (!team) throw notFound('Team not found');
      const q = studentSearchSchema.parse({ ...request.query });
      const studentIdsInOtherTeams = await prisma.teamMember.findMany({
        where: {
          tenantId,
          team: { categoryId, id: { not: teamId } },
        },
        select: { studentId: true },
      });
      const excludedIds = new Set(studentIdsInOtherTeams.map((m) => m.studentId));
      const where: Record<string, unknown> = { tenantId };
      if (excludedIds.size > 0) {
        where.id = { notIn: Array.from(excludedIds) };
      }
      if (q.classStandard) where.classStandard = q.classStandard;
      if (q.section) where.section = q.section;
      if (q.active !== undefined) where.active = q.active;
      if (q.q) {
        where.OR = [
          { fullName: { contains: q.q, mode: 'insensitive' } },
          { admissionNo: { contains: q.q, mode: 'insensitive' } },
        ];
      }
      const list = await prisma.student.findMany({
        where,
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        orderBy: [{ classStandard: 'asc' }, { section: 'asc' }, { fullName: 'asc' }],
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          classStandard: true,
          section: true,
        },
      });
      const nextCursor = list.length > q.limit ? list[q.limit - 1]?.id : null;
      return reply.send({ data: list.slice(0, q.limit), nextCursor });
    }
  );

  app.patch<{ Params: { tenantId: string; categoryId: string; teamId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const body = updateTeamSchema.parse(request.body);
      const team = await prisma.team.update({
        where: { id: teamId },
        data: body,
      });
      if (team.tenantId !== tenantId || team.categoryId !== categoryId) throw notFound('Team not found');
      return reply.send(team);
    }
  );

  app.delete<{ Params: { tenantId: string; categoryId: string; teamId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const t = await prisma.team.findFirst({ where: { id: teamId, categoryId, tenantId } });
      if (!t) throw notFound('Team not found');
      await prisma.team.delete({ where: { id: teamId } });
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { tenantId: string; categoryId: string; teamId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId/members',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const team = await prisma.team.findFirst({ where: { id: teamId, categoryId, tenantId } });
      if (!team) throw notFound('Team not found');
      const body = addTeamMemberSchema.parse(request.body);
      const student = await prisma.student.findFirst({ where: { id: body.studentId, tenantId } });
      if (!student) throw notFound('Student not found');
      const existingInOtherTeam = await prisma.teamMember.findFirst({
        where: {
          studentId: body.studentId,
          tenantId,
          team: { categoryId, id: { not: teamId } },
        },
        include: { team: { select: { name: true } } },
      });
      if (existingInOtherTeam) {
        throw badRequest(
          `This student is already in "${existingInOtherTeam.team.name}" in this category. A student can only be in one team per category.`
        );
      }
      const member = await prisma.teamMember.create({
        data: { tenantId, teamId, studentId: body.studentId },
      });
      return reply.status(201).send(member);
    }
  );

  app.delete<{ Params: { tenantId: string; categoryId: string; teamId: string; memberId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/teams/:teamId/members/:memberId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const teamId = (request.params as { teamId: string }).teamId;
      const memberId = (request.params as { memberId: string }).memberId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const m = await prisma.teamMember.findFirst({
        where: { id: memberId, teamId, tenantId },
        include: { team: true },
      });
      if (!m || m.team.categoryId !== categoryId) throw notFound('Member not found');
      await prisma.teamMember.delete({ where: { id: memberId } });
      return reply.status(204).send();
    }
  );

  // Bracket
  app.post<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/bracket/generate',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        return generateKnockoutBracket(tx, categoryId, tenantId);
      });
      return reply.send(result);
    }
  );

  // Matches (by category, grouped by round)
  app.get<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/matches',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const matches = await prisma.match.findMany({
        where: { categoryId, tenantId },
        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
        select: {
          id: true,
          roundNumber: true,
          matchNumber: true,
          teamAId: true,
          teamBId: true,
          winnerTeamId: true,
          status: true,
          scheduledAt: true,
          venue: true,
          result: { select: { winnerTeamId: true, method: true } },
          matchScorecard: { select: { summaryA: true, summaryB: true, winnerTeamId: true } },
          scorecard: { select: { summaryA: true, summaryB: true } },
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
      });
      const byRound: Record<number, typeof matches> = {};
      for (const m of matches) {
        if (!byRound[m.roundNumber]) byRound[m.roundNumber] = [];
        byRound[m.roundNumber].push(m);
      }
      return reply.send({ data: matches, byRound });
    }
  );

  // Scorecard
  app.get<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId/scorecard',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const scorecard = await prisma.scorecard.findFirst({
        where: { matchId, tenantId },
      });
      if (!scorecard) return reply.status(404).send({ error: 'Scorecard not found' });
      return reply.send(scorecard);
    }
  );

  app.put<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId/scorecard',
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
      const body = scorecardUpsertBodySchema.parse(request.body);
      const scoringModel = match.category.competitionSport.sport.scoringModel;
      if (body.scoringModel && body.scoringModel !== scoringModel) {
        throw badRequest(`Scoring model mismatch. Category sport uses ${scoringModel}.`);
      }
      const normalized = normalizeScorecardByModel(
        scoringModel,
        match.category.competitionSport.sport.matchConfigJson,
        body
      );
      const scorecard = await prisma.scorecard.upsert({
        where: { matchId },
        create: {
          tenantId,
          matchId,
          scoringModel: normalized.scoringModel,
          scorecardJson: normalized.scorecardJson as object,
          summaryA: normalized.summaryA,
          summaryB: normalized.summaryB,
          numericScoreA: normalized.numericScoreA,
          numericScoreB: normalized.numericScoreB,
        },
        update: {
          scoringModel: normalized.scoringModel,
          scorecardJson: normalized.scorecardJson as object,
          summaryA: normalized.summaryA,
          summaryB: normalized.summaryB,
          numericScoreA: normalized.numericScoreA,
          numericScoreB: normalized.numericScoreB,
        },
      });
      return reply.send(scorecard);
    }
  );

  app.post<{ Params: { tenantId: string; matchId: string } }>(
    '/tenants/:tenantId/matches/:matchId/finalize',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { matchId } = matchIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const body = finalizeMatchSchema.parse(request.body);
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const userId = (request as { user: { userId: string } }).user.userId;
        await finalizeMatch(
          tx,
          matchId,
          tenantId,
          body.winnerTeamId,
          body.method as 'NORMAL' | 'BYE' | 'WALKOVER' | 'TIEBREAKER',
          userId,
          body.notes
        );
      });
      return reply.send({ ok: true });
    }
  );

  // Individual: participants
  app.get<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/participants',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const list = await prisma.participantEntry.findMany({
        where: { categoryId, tenantId },
        include: { student: { select: { id: true, admissionNo: true, fullName: true, classStandard: true, section: true } } },
      });
      return reply.send({ data: list });
    }
  );

  app.post<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/participants',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const body = addParticipantSchema.parse(request.body);
      const student = await prisma.student.findFirst({ where: { id: body.studentId, tenantId } });
      if (!student) throw notFound('Student not found');
      const entry = await prisma.participantEntry.create({
        data: { tenantId, categoryId, studentId: body.studentId },
      });
      return reply.status(201).send(entry);
    }
  );

  app.post<{ Params: { tenantId: string; categoryId: string }; Body: { studentIds: string[] } }>(
    '/tenants/:tenantId/categories/:categoryId/participants/bulk',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const body = bulkParticipantsSchema.parse(request.body);
      const created: string[] = [];
      for (const studentId of body.studentIds) {
        try {
          await prisma.participantEntry.upsert({
            where: { categoryId_studentId: { categoryId, studentId } },
            create: { tenantId, categoryId, studentId },
            update: {},
          });
          created.push(studentId);
        } catch {
          // skip duplicate
        }
      }
      return reply.send({ created: created.length });
    }
  );

  app.delete<{ Params: { tenantId: string; categoryId: string; entryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/participants/:entryId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const categoryId = (request.params as { categoryId: string }).categoryId;
      const entryId = (request.params as { entryId: string }).entryId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const e = await prisma.participantEntry.findFirst({
        where: { id: entryId, categoryId, tenantId },
      });
      if (!e) throw notFound('Participant entry not found');
      await prisma.participantEntry.delete({ where: { id: entryId } });
      return reply.status(204).send();
    }
  );

  // Individual: results (bulk upsert)
  app.put<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/results',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const body = bulkResultsSchema.parse(request.body);
      for (const r of body.results) {
        const entry = await prisma.participantEntry.findFirst({
          where: { id: r.participantEntryId, categoryId, tenantId },
        });
        if (!entry) continue;
        await prisma.individualResult.upsert({
          where: { participantEntryId: r.participantEntryId },
          create: {
            tenantId,
            participantEntryId: r.participantEntryId,
            numericValue: r.numericValue,
            displayValue: r.displayValue,
            rank: r.rank,
          },
          update: { numericValue: r.numericValue, displayValue: r.displayValue, rank: r.rank },
        });
      }
      return reply.send({ ok: true });
    }
  );

  // Leaderboard
  app.get<{ Params: { tenantId: string; categoryId: string } }>(
    '/tenants/:tenantId/categories/:categoryId/leaderboard',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { categoryId } = categoryIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const cat = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
      if (!cat) throw notFound('Category not found');
      const results = await prisma.individualResult.findMany({
        where: {
          tenantId,
          participantEntry: { categoryId },
        },
        include: {
          participantEntry: {
            include: {
              student: { select: { id: true, admissionNo: true, fullName: true, classStandard: true, section: true } },
            },
          },
        },
        orderBy: { rank: 'asc' },
      });
      return reply.send({ data: results });
    }
  );
}

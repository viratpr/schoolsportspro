import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { enableSportSchema, updateCompetitionSportSchema } from '../schemas/tenant.js';
import { tenantIdParam, competitionIdParam, competitionSportIdParam } from '../schemas/common.js';
import { badRequest, notFound } from '../lib/errors.js';
import { Prisma, Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
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
        select: {
          ...competitionSportBaseSelect,
          sport: {
            select: {
              id: true,
              name: true,
              sportType: true,
              scoringModel: true,
              defaultRulesText: true,
              defaultCategoryTemplatesJson: true,
              teamConfigJson: true,
              matchConfigJson: true,
              templateVersion: true,
            },
          },
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
        select: {
          ...competitionSportBaseSelect,
          sport: { select: { id: true, name: true, sportType: true, scoringModel: true } },
        },
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
      const sport = await findSportForEnable(body.sportId);
      if (!sport) throw notFound('Sport not found');
      const requestedInternational = body.scoringMode === 'INTERNATIONAL';
      const hasInternationalRules =
        sport.hasInternationalRules ||
        Boolean(sport.internationalTemplateJson) ||
        inferHasInternationalRulesByName(sport.name);
      if (requestedInternational && !hasInternationalRules) {
        throw badRequest(`International scoring is not available for ${sport.name}.`);
      }
      const internationalTemplateFallback =
        requestedInternational && !sport.internationalTemplateJson
          ? buildInternationalTemplateFallback(sport.name, sport.scorecardTemplateJson)
          : undefined;
      if (requestedInternational && !sport.internationalTemplateJson && !internationalTemplateFallback) {
        throw badRequest(`International template is not configured for ${sport.name}.`);
      }
      const scoringMode: 'SIMPLE' | 'INTERNATIONAL' = requestedInternational ? 'INTERNATIONAL' : 'SIMPLE';
      const templateSnapshotJson =
        scoringMode === 'INTERNATIONAL'
          ? (sport.internationalTemplateJson ?? internationalTemplateFallback ?? undefined)
          : (sport.scorecardTemplateJson ?? undefined);
      const existing = await prisma.competitionSport.findFirst({
        where: { competitionId, sportId: body.sportId, tenantId },
        select: { id: true },
      });
      if (existing) {
        const baseUpdateData = {
          enabled: body.enabled,
          overriddenRulesText: body.overriddenRulesText,
          templateSnapshotJson: templateSnapshotJson as object | undefined,
          scoringMode,
          ...(body.coordinatorName !== undefined && { coordinatorName: body.coordinatorName }),
          ...(body.coordinatorPhone !== undefined && { coordinatorPhone: body.coordinatorPhone }),
          ...(body.coordinatorEmail !== undefined && { coordinatorEmail: body.coordinatorEmail }),
        };
        const updated = await updateCompetitionSportCompat(existing.id, baseUpdateData);
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
      const cs = await createCompetitionSportCompat({
        tenantId,
        competitionId,
        sportId: body.sportId,
        enabled: body.enabled,
        overriddenRulesText: body.overriddenRulesText,
        scoringMode,
        templateSnapshotJson: templateSnapshotJson as object | undefined,
        templateVersion: sport.templateVersion ?? undefined,
        coordinatorName: body.coordinatorName,
        coordinatorPhone: body.coordinatorPhone,
        coordinatorEmail: body.coordinatorEmail,
      });
      return reply.status(201).send(cs);
    }
  );

  app.patch<{ Params: { tenantId: string; competitionSportId: string } }>(
    '/tenants/:tenantId/competition-sports/:competitionSportId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { competitionSportId } = competitionSportIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const cs = await prisma.competitionSport.findFirst({
        where: { id: competitionSportId, tenantId },
        select: { id: true },
      });
      if (!cs) throw notFound('Competition sport not found');
      const body = updateCompetitionSportSchema.parse(request.body);
      const data: {
        coordinatorName?: string | null;
        coordinatorPhone?: string | null;
        coordinatorEmail?: string | null;
      } = {};
      if (body.coordinatorName !== undefined) data.coordinatorName = body.coordinatorName;
      if (body.coordinatorPhone !== undefined) data.coordinatorPhone = body.coordinatorPhone;
      if (body.coordinatorEmail !== undefined) data.coordinatorEmail = body.coordinatorEmail;
      const updated = await prisma.competitionSport.update({
        where: { id: competitionSportId },
        data,
        select: competitionSportBaseSelect,
      });
      return reply.send(updated);
    }
  );
}

const competitionSportBaseSelect = {
  id: true,
  tenantId: true,
  competitionId: true,
  sportId: true,
  enabled: true,
  overriddenRulesText: true,
  templateSnapshotJson: true,
  templateVersion: true,
  coordinatorName: true,
  coordinatorPhone: true,
  coordinatorEmail: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function findSportForEnable(sportId: string) {
  const baseSelect = {
    id: true,
    name: true,
    templateVersion: true,
    scorecardTemplateJson: true,
  };
  try {
    return await prisma.sport.findUnique({
      where: { id: sportId },
      select: {
        ...baseSelect,
        hasInternationalRules: true,
        internationalTemplateJson: true,
      },
    });
  } catch (error) {
    if (isMissingDualModeSchemaError(error)) {
      const sport = await prisma.sport.findUnique({
        where: { id: sportId },
        select: baseSelect,
      });
      if (!sport) return null;
      return {
        ...sport,
        hasInternationalRules: inferHasInternationalRulesByName(sport.name),
        internationalTemplateJson: null,
      };
    }
    throw error;
  }
}

async function createCompetitionSportCompat(data: {
  tenantId: string;
  competitionId: string;
  sportId: string;
  enabled: boolean;
  overriddenRulesText?: string;
  scoringMode: 'SIMPLE' | 'INTERNATIONAL';
  templateSnapshotJson?: object;
  templateVersion?: number;
  coordinatorName?: string;
  coordinatorPhone?: string;
  coordinatorEmail?: string;
}) {
  try {
    return await prisma.competitionSport.create({
      data,
      select: competitionSportBaseSelect,
    });
  } catch (error) {
    if (isMissingDualModeSchemaError(error)) {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          tenantId: string;
          competitionId: string;
          sportId: string;
          enabled: boolean;
          overriddenRulesText: string | null;
          templateSnapshotJson: Prisma.JsonValue | null;
          templateVersion: number | null;
          coordinatorName: string | null;
          coordinatorPhone: string | null;
          coordinatorEmail: string | null;
          createdAt: Date;
          updatedAt: Date;
        }>
      >(Prisma.sql`
        INSERT INTO "CompetitionSport" (
          "id",
          "tenantId",
          "competitionId",
          "sportId",
          "enabled",
          "overriddenRulesText",
          "templateSnapshotJson",
          "templateVersion",
          "coordinatorName",
          "coordinatorPhone",
          "coordinatorEmail",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${crypto.randomUUID().replace(/-/g, '')},
          ${data.tenantId},
          ${data.competitionId},
          ${data.sportId},
          ${data.enabled},
          ${data.overriddenRulesText ?? null},
          ${JSON.stringify(data.templateSnapshotJson ?? null)}::jsonb,
          ${data.templateVersion ?? null},
          ${data.coordinatorName ?? null},
          ${data.coordinatorPhone ?? null},
          ${data.coordinatorEmail ?? null},
          NOW(),
          NOW()
        )
        RETURNING
          "id",
          "tenantId",
          "competitionId",
          "sportId",
          "enabled",
          "overriddenRulesText",
          "templateSnapshotJson",
          "templateVersion",
          "coordinatorName",
          "coordinatorPhone",
          "coordinatorEmail",
          "createdAt",
          "updatedAt"
      `);
      return rows[0] ?? null;
    }
    throw error;
  }
}

async function updateCompetitionSportCompat(
  id: string,
  data: {
    enabled: boolean;
    overriddenRulesText?: string;
    scoringMode: 'SIMPLE' | 'INTERNATIONAL';
    templateSnapshotJson?: object;
    coordinatorName?: string;
    coordinatorPhone?: string;
    coordinatorEmail?: string;
  }
) {
  try {
    return await prisma.competitionSport.update({
      where: { id },
      data,
      select: competitionSportBaseSelect,
    });
  } catch (error) {
    if (isMissingDualModeSchemaError(error)) {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          tenantId: string;
          competitionId: string;
          sportId: string;
          enabled: boolean;
          overriddenRulesText: string | null;
          templateSnapshotJson: Prisma.JsonValue | null;
          templateVersion: number | null;
          coordinatorName: string | null;
          coordinatorPhone: string | null;
          coordinatorEmail: string | null;
          createdAt: Date;
          updatedAt: Date;
        }>
      >(Prisma.sql`
        UPDATE "CompetitionSport"
        SET
          "enabled" = ${data.enabled},
          "overriddenRulesText" = ${data.overriddenRulesText ?? null},
          "templateSnapshotJson" = ${JSON.stringify(data.templateSnapshotJson ?? null)}::jsonb,
          "coordinatorName" = ${data.coordinatorName ?? null},
          "coordinatorPhone" = ${data.coordinatorPhone ?? null},
          "coordinatorEmail" = ${data.coordinatorEmail ?? null},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING
          "id",
          "tenantId",
          "competitionId",
          "sportId",
          "enabled",
          "overriddenRulesText",
          "templateSnapshotJson",
          "templateVersion",
          "coordinatorName",
          "coordinatorPhone",
          "coordinatorEmail",
          "createdAt",
          "updatedAt"
      `);
      return rows[0] ?? null;
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

function buildInternationalTemplateFallback(
  sportName: string,
  simpleTemplate: Prisma.JsonValue | null
): Prisma.JsonValue | null {
  if (!simpleTemplate || typeof simpleTemplate !== 'object' || Array.isArray(simpleTemplate)) {
    return simpleTemplate;
  }

  const normalized = sportName.trim().toLowerCase();
  const base = simpleTemplate as Record<string, unknown>;
  const match = (base.match && typeof base.match === 'object' && !Array.isArray(base.match)
    ? (base.match as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const existingShared = Array.isArray(match.sharedFields) ? [...match.sharedFields] : [];

  const addSharedFields = (fields: Array<Record<string, unknown>>) => ({
    ...base,
    displayName: `${sportName} (International)`,
    match: {
      ...match,
      sharedFields: [...existingShared, ...fields],
    },
  });

  if (normalized === 'basketball') {
    return addSharedFields([
      { key: 'q1TeamA', label: 'Q1 Points (Team A)', type: 'number', min: 0 },
      { key: 'q1TeamB', label: 'Q1 Points (Team B)', type: 'number', min: 0 },
      { key: 'q2TeamA', label: 'Q2 Points (Team A)', type: 'number', min: 0 },
      { key: 'q2TeamB', label: 'Q2 Points (Team B)', type: 'number', min: 0 },
      { key: 'q3TeamA', label: 'Q3 Points (Team A)', type: 'number', min: 0 },
      { key: 'q3TeamB', label: 'Q3 Points (Team B)', type: 'number', min: 0 },
      { key: 'q4TeamA', label: 'Q4 Points (Team A)', type: 'number', min: 0 },
      { key: 'q4TeamB', label: 'Q4 Points (Team B)', type: 'number', min: 0 },
      { key: 'otTeamA', label: 'OT Points (Team A)', type: 'number', min: 0 },
      { key: 'otTeamB', label: 'OT Points (Team B)', type: 'number', min: 0 },
    ]);
  }

  if (normalized === 'soccer' || normalized === 'football') {
    return addSharedFields([
      { key: 'half1TeamA', label: '1st Half Goals (Team A)', type: 'number', min: 0 },
      { key: 'half1TeamB', label: '1st Half Goals (Team B)', type: 'number', min: 0 },
      { key: 'half2TeamA', label: '2nd Half Goals (Team A)', type: 'number', min: 0 },
      { key: 'half2TeamB', label: '2nd Half Goals (Team B)', type: 'number', min: 0 },
    ]);
  }

  if (normalized === 'baseball/softball' || normalized === 'baseball' || normalized === 'softball') {
    return {
      ...addSharedFields([
        { key: 'inning1A', label: 'Inning 1 Runs (A)', type: 'number', min: 0 },
        { key: 'inning1B', label: 'Inning 1 Runs (B)', type: 'number', min: 0 },
        { key: 'inning2A', label: 'Inning 2 Runs (A)', type: 'number', min: 0 },
        { key: 'inning2B', label: 'Inning 2 Runs (B)', type: 'number', min: 0 },
        { key: 'inning3A', label: 'Inning 3 Runs (A)', type: 'number', min: 0 },
        { key: 'inning3B', label: 'Inning 3 Runs (B)', type: 'number', min: 0 },
        { key: 'inning4A', label: 'Inning 4 Runs (A)', type: 'number', min: 0 },
        { key: 'inning4B', label: 'Inning 4 Runs (B)', type: 'number', min: 0 },
        { key: 'inning5A', label: 'Inning 5 Runs (A)', type: 'number', min: 0 },
        { key: 'inning5B', label: 'Inning 5 Runs (B)', type: 'number', min: 0 },
        { key: 'inning6A', label: 'Inning 6 Runs (A)', type: 'number', min: 0 },
        { key: 'inning6B', label: 'Inning 6 Runs (B)', type: 'number', min: 0 },
        { key: 'inning7A', label: 'Inning 7 Runs (A)', type: 'number', min: 0 },
        { key: 'inning7B', label: 'Inning 7 Runs (B)', type: 'number', min: 0 },
        { key: 'inning8A', label: 'Inning 8 Runs (A)', type: 'number', min: 0 },
        { key: 'inning8B', label: 'Inning 8 Runs (B)', type: 'number', min: 0 },
        { key: 'inning9A', label: 'Inning 9 Runs (A)', type: 'number', min: 0 },
        { key: 'inning9B', label: 'Inning 9 Runs (B)', type: 'number', min: 0 },
        { key: 'inning10A', label: 'Inning 10 Runs (A)', type: 'number', min: 0 },
        { key: 'inning10B', label: 'Inning 10 Runs (B)', type: 'number', min: 0 },
        { key: 'inning11A', label: 'Inning 11 Runs (A)', type: 'number', min: 0 },
        { key: 'inning11B', label: 'Inning 11 Runs (B)', type: 'number', min: 0 },
        { key: 'inning12A', label: 'Inning 12 Runs (A)', type: 'number', min: 0 },
        { key: 'inning12B', label: 'Inning 12 Runs (B)', type: 'number', min: 0 },
        { key: 'hitsA', label: 'H (Team A)', type: 'number', min: 0 },
        { key: 'hitsB', label: 'H (Team B)', type: 'number', min: 0 },
        { key: 'errorsA', label: 'E (Team A)', type: 'number', min: 0 },
        { key: 'errorsB', label: 'E (Team B)', type: 'number', min: 0 },
        { key: 'leftOnBaseA', label: 'LOB (Team A)', type: 'number', min: 0 },
        { key: 'leftOnBaseB', label: 'LOB (Team B)', type: 'number', min: 0 },
      ]),
      players: {
        enabled: true,
        columns: [
          { key: 'battingOrder', label: '#', type: 'number', min: 1, max: 99 },
          { key: 'position', label: 'Pos', type: 'text' },
          { key: 'inningsPlayed', label: 'Inn', type: 'text' },
          { key: 'singles', label: '1B', type: 'number', min: 0 },
          { key: 'doubles', label: '2B', type: 'number', min: 0 },
          { key: 'triples', label: '3B', type: 'number', min: 0 },
          { key: 'homeRuns', label: 'HR', type: 'number', min: 0 },
          { key: 'runsBattedIn', label: 'RBI', type: 'number', min: 0 },
          { key: 'runs', label: 'R', type: 'number', min: 0 },
          { key: 'walks', label: 'BB', type: 'number', min: 0 },
          { key: 'strikeOuts', label: 'SO', type: 'number', min: 0 },
          { key: 'hitByPitch', label: 'HBP', type: 'number', min: 0 },
          { key: 'sacrificeFly', label: 'SF', type: 'number', min: 0 },
          { key: 'sacrificeHit', label: 'SH', type: 'number', min: 0 },
        ],
      },
      ui: {
        hints: [
          'International baseball scorebook style: inning-wise runs (1-12), team totals (R/H/E/LOB), and detailed batter line stats.',
        ],
      },
    };
  }

  if (normalized === 'tennis') {
    return addSharedFields([
      { key: 'set1GamesA', label: 'Set 1 Games (A)', type: 'number', min: 0 },
      { key: 'set1GamesB', label: 'Set 1 Games (B)', type: 'number', min: 0 },
      { key: 'set2GamesA', label: 'Set 2 Games (A)', type: 'number', min: 0 },
      { key: 'set2GamesB', label: 'Set 2 Games (B)', type: 'number', min: 0 },
      { key: 'set3GamesA', label: 'Set 3 Games (A)', type: 'number', min: 0 },
      { key: 'set3GamesB', label: 'Set 3 Games (B)', type: 'number', min: 0 },
    ]);
  }

  if (normalized === 'wrestling') {
    return addSharedFields([
      { key: 'period1A', label: 'Period 1 Points (A)', type: 'number', min: 0 },
      { key: 'period1B', label: 'Period 1 Points (B)', type: 'number', min: 0 },
      { key: 'period2A', label: 'Period 2 Points (A)', type: 'number', min: 0 },
      { key: 'period2B', label: 'Period 2 Points (B)', type: 'number', min: 0 },
      { key: 'fallA', label: 'Fall / Pin by A', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'fallB', label: 'Fall / Pin by B', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
    ]);
  }

  if (
    normalized === 'track & field 100m' ||
    normalized === 'track and field 100m' ||
    normalized === 'athletics 100m'
  ) {
    return addSharedFields([
      { key: 'reactionTimeA', label: 'Reaction Time A (s)', type: 'number', min: 0, step: 0.001 },
      { key: 'reactionTimeB', label: 'Reaction Time B (s)', type: 'number', min: 0, step: 0.001 },
      { key: 'laneA', label: 'Lane A', type: 'number', min: 1, max: 9 },
      { key: 'laneB', label: 'Lane B', type: 'number', min: 1, max: 9 },
    ]);
  }

  if (normalized === 'swimming 50m freestyle') {
    return addSharedFields([
      { key: 'split25mA', label: '25m Split A (s)', type: 'number', min: 0, step: 0.01 },
      { key: 'split25mB', label: '25m Split B (s)', type: 'number', min: 0, step: 0.01 },
      { key: 'strokeViolationA', label: 'Stroke Violation A', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'strokeViolationB', label: 'Stroke Violation B', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'dqReasonA', label: 'DQ Reason A', type: 'text' },
      { key: 'dqReasonB', label: 'DQ Reason B', type: 'text' },
    ]);
  }

  return null;
}

function isMissingDualModeSchemaError(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2022';
}

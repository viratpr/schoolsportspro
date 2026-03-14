import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';

/** Resolve shareToken to Competition. Returns null if not found or token not set. */
async function resolveCompetitionByShareToken(shareToken: string) {
  if (!shareToken?.trim()) return null;
  const competition = await prisma.competition.findFirst({
    where: { shareToken: shareToken.trim() },
    include: {
      competitionSports: {
        include: {
          categories: {
            select: { id: true, name: true, format: true },
          },
        },
      },
    },
  });
  return competition;
}

/** Ensure category belongs to the competition (via competitionSport). Returns category or null. */
async function getCategoryInCompetition(competitionId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      competitionSport: { competitionId },
    },
  });
  return category;
}

export default async function publicRoutes(app: FastifyInstance) {
  // No verifyJWT - these routes are public read-only.

  app.get<{ Params: { shareToken: string } }>(
    '/public/competitions/:shareToken',
    async (request, reply) => {
      const { shareToken } = request.params;
      const competition = await resolveCompetitionByShareToken(shareToken);
      if (!competition) throw notFound('Competition not found or link is disabled.');
      const categories = competition.competitionSports.flatMap((cs) =>
        cs.categories.map((c) => ({ id: c.id, name: c.name, format: c.format }))
      );
      return reply.send({
        id: competition.id,
        name: competition.name,
        academicYear: competition.academicYear,
        startDate: competition.startDate,
        endDate: competition.endDate,
        venue: competition.venue,
        status: competition.status,
        categories,
      });
    }
  );

  app.get<{ Params: { shareToken: string; categoryId: string } }>(
    '/public/competitions/:shareToken/categories/:categoryId/matches',
    async (request, reply) => {
      const { shareToken, categoryId } = request.params;
      const competition = await resolveCompetitionByShareToken(shareToken);
      if (!competition) throw notFound('Competition not found or link is disabled.');
      const category = await getCategoryInCompetition(competition.id, categoryId);
      if (!category) throw notFound('Category not found.');
      const matches = await prisma.match.findMany({
        where: { categoryId, tenantId: competition.tenantId },
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

  app.get<{ Params: { shareToken: string; categoryId: string } }>(
    '/public/competitions/:shareToken/categories/:categoryId/leaderboard',
    async (request, reply) => {
      const { shareToken, categoryId } = request.params;
      const competition = await resolveCompetitionByShareToken(shareToken);
      if (!competition) throw notFound('Competition not found or link is disabled.');
      const category = await getCategoryInCompetition(competition.id, categoryId);
      if (!category) throw notFound('Category not found.');
      const results = await prisma.individualResult.findMany({
        where: {
          tenantId: competition.tenantId,
          participantEntry: { categoryId },
        },
        include: {
          participantEntry: {
            include: {
              student: {
                select: {
                  id: true,
                  admissionNo: true,
                  fullName: true,
                  classStandard: true,
                  section: true,
                },
              },
            },
          },
        },
        orderBy: { rank: 'asc' },
      });
      return reply.send({ data: results });
    }
  );

  /** Aggregated: competition + all categories with matches and leaderboards (one request for live page polling). */
  app.get<{ Params: { shareToken: string } }>(
    '/public/competitions/:shareToken/full',
    async (request, reply) => {
      const { shareToken } = request.params;
      const competition = await resolveCompetitionByShareToken(shareToken);
      if (!competition) throw notFound('Competition not found or link is disabled.');
      const categories = competition.competitionSports.flatMap((cs) => cs.categories);
      const categoriesWithData = await Promise.all(
        categories.map(async (cat) => {
          const [matches, leaderboard] = await Promise.all([
            prisma.match.findMany({
              where: { categoryId: cat.id, tenantId: competition.tenantId },
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
            }),
            prisma.individualResult.findMany({
              where: {
                tenantId: competition.tenantId,
                participantEntry: { categoryId: cat.id },
              },
              include: {
                participantEntry: {
                  include: {
                    student: {
                      select: {
                        id: true,
                        admissionNo: true,
                        fullName: true,
                        classStandard: true,
                        section: true,
                      },
                    },
                  },
                },
              },
              orderBy: { rank: 'asc' },
            }),
          ]);
          const byRound: Record<number, typeof matches> = {};
          for (const m of matches) {
            if (!byRound[m.roundNumber]) byRound[m.roundNumber] = [];
            byRound[m.roundNumber].push(m);
          }
          return {
            id: cat.id,
            name: cat.name,
            format: cat.format,
            matches: { data: matches, byRound },
            leaderboard: { data: leaderboard },
          };
        })
      );
      return reply.send({
        id: competition.id,
        name: competition.name,
        academicYear: competition.academicYear,
        startDate: competition.startDate,
        endDate: competition.endDate,
        venue: competition.venue,
        status: competition.status,
        categories: categoriesWithData,
      });
    }
  );
}

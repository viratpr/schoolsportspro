import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import { Role } from '@bharatathlete/db';

export default async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/dashboard-summary',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

      const [
        studentsCount,
        competitionsCount,
        categoriesCount,
        participantsCount,
        matchesTotal,
        matchesCompleted,
        publicCompetitionsCount,
      ] = await Promise.all([
        prisma.student.count({ where: { tenantId, active: true } }),
        prisma.competition.count({ where: { tenantId } }),
        prisma.category.count({ where: { tenantId } }),
        prisma.participantEntry.count({ where: { tenantId } }),
        prisma.match.count({ where: { tenantId } }),
        prisma.match.count({ where: { tenantId, status: 'COMPLETED' } }),
        prisma.competition.count({ where: { tenantId, NOT: { shareToken: null } } }),
      ]);

      return reply.send({
        studentsCount,
        competitionsCount,
        categoriesCount,
        participantsCount,
        matchesTotal,
        matchesCompleted,
        publicCompetitionsCount,
      });
    }
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/dashboard-chart-data',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

      const [participantEntries, matches] = await Promise.all([
        prisma.participantEntry.findMany({
          where: { tenantId },
          select: {
            categoryId: true,
            category: {
              select: {
                competitionSport: {
                  select: {
                    competitionId: true,
                    competition: { select: { id: true, name: true, academicYear: true } },
                    sportId: true,
                    sport: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.match.findMany({
          where: { tenantId },
          select: {
            status: true,
            category: {
              select: {
                competitionSport: {
                  select: {
                    competitionId: true,
                    competition: { select: { id: true, name: true, academicYear: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      const participantsByCompetitionMap = new Map<string, { competitionId: string; competitionName: string; academicYear: string; count: number }>();
      const participantsBySportMap = new Map<string, { sportId: string; sportName: string; count: number }>();

      for (const pe of participantEntries) {
        const cs = pe.category?.competitionSport;
        if (!cs) continue;
        const comp = cs.competition;
        const sport = cs.sport;
        if (comp) {
          const existing = participantsByCompetitionMap.get(comp.id);
          if (existing) existing.count += 1;
          else participantsByCompetitionMap.set(comp.id, { competitionId: comp.id, competitionName: comp.name, academicYear: comp.academicYear, count: 1 });
        }
        if (sport) {
          const existing = participantsBySportMap.get(sport.id);
          if (existing) existing.count += 1;
          else participantsBySportMap.set(sport.id, { sportId: sport.id, sportName: sport.name, count: 1 });
        }
      }

      const matchesByCompetitionMap = new Map<string, { competitionId: string; competitionName: string; academicYear: string; total: number; completed: number }>();
      for (const m of matches) {
        const comp = m.category?.competitionSport?.competition;
        if (!comp) continue;
        const existing = matchesByCompetitionMap.get(comp.id);
        if (existing) {
          existing.total += 1;
          if (m.status === 'COMPLETED') existing.completed += 1;
        } else {
          matchesByCompetitionMap.set(comp.id, {
            competitionId: comp.id,
            competitionName: comp.name,
            academicYear: comp.academicYear,
            total: 1,
            completed: m.status === 'COMPLETED' ? 1 : 0,
          });
        }
      }

      const participantsByCompetition = Array.from(participantsByCompetitionMap.values()).sort((a, b) =>
        a.academicYear.localeCompare(b.academicYear) || a.competitionName.localeCompare(b.competitionName)
      );
      const participantsBySport = Array.from(participantsBySportMap.values()).sort((a, b) => b.count - a.count);
      const matchesByCompetition = Array.from(matchesByCompetitionMap.values()).sort((a, b) =>
        a.academicYear.localeCompare(b.academicYear) || a.competitionName.localeCompare(b.competitionName)
      );

      return reply.send({
        participantsByCompetition,
        participantsBySport,
        matchesByCompetition,
      });
    }
  );
}


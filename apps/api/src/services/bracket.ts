import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import type { PrismaClient } from '@bharatathlete/db';
import { MatchStatus, MatchResultMethod } from '@bharatathlete/db';

function nextPowerOf2(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export async function generateKnockoutBracket(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  categoryId: string,
  tenantId: string
) {
  const category = await tx.category.findFirst({
    where: { id: categoryId, tenantId },
    include: { teams: { orderBy: { createdAt: 'asc' } } },
  });
  if (!category) throw notFound('Category not found');
  if (category.format !== 'KNOCKOUT') throw badRequest('Category must be KNOCKOUT format');

  const teams = category.teams;
  const n = teams.length;
  if (n < 2) throw badRequest('At least 2 teams required');

  const bracketSize = nextPowerOf2(n);
  const roundCount = Math.log2(bracketSize);
  const round1MatchCount = bracketSize / 2;

  const existing = await tx.match.count({ where: { categoryId } });
  if (existing > 0) throw badRequest('Bracket already generated');

  const matches: { categoryId: string; tenantId: string; roundNumber: number; matchNumber: number; teamAId: string | null; teamBId: string | null; status: MatchStatus }[] = [];

  for (let r = 1; r <= roundCount; r++) {
    const matchesInRound = Math.pow(2, roundCount - r);
    for (let m = 1; m <= matchesInRound; m++) {
      let teamAId: string | null = null;
      let teamBId: string | null = null;
      if (r === 1) {
        const slotA = (m - 1) * 2;
        const slotB = (m - 1) * 2 + 1;
        if (teams[slotA]) teamAId = teams[slotA].id;
        if (teams[slotB]) teamBId = teams[slotB].id;
      }
      matches.push({
        categoryId,
        tenantId,
        roundNumber: r,
        matchNumber: m,
        teamAId,
        teamBId,
        status: r === 1 && (teamAId && !teamBId) || (!teamAId && teamBId) ? MatchStatus.READY : MatchStatus.SCHEDULED,
      });
    }
  }

  await tx.match.createMany({ data: matches });

  const byesToFinalize: { matchId: string; winnerTeamId: string }[] = [];
  const created = await tx.match.findMany({
    where: { categoryId, roundNumber: 1 },
    orderBy: { matchNumber: 'asc' },
  });
  for (const match of created) {
    if (match.teamAId && !match.teamBId) byesToFinalize.push({ matchId: match.id, winnerTeamId: match.teamAId! });
    if (!match.teamAId && match.teamBId) byesToFinalize.push({ matchId: match.id, winnerTeamId: match.teamBId! });
  }

  const totalMatches = matches.length;
  await tx.categoryStats.upsert({
    where: { categoryId },
    create: { tenantId, categoryId, totalTeams: n, totalMatches, completedMatches: 0 },
    update: { totalTeams: n, totalMatches, completedMatches: 0, lastUpdatedAt: new Date() },
  });

  for (const { matchId, winnerTeamId } of byesToFinalize) {
    await finalizeMatchInternal(tx, matchId, tenantId, winnerTeamId, MatchResultMethod.BYE, null);
  }

  return { created: matches.length, byeAdvancements: byesToFinalize.length };
}

export async function finalizeMatch(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  matchId: string,
  tenantId: string,
  winnerTeamId: string,
  method: MatchResultMethod,
  finalizedByUserId: string,
  notes?: string | null
) {
  return finalizeMatchInternal(tx, matchId, tenantId, winnerTeamId, method, finalizedByUserId, notes);
}

async function finalizeMatchInternal(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  matchId: string,
  tenantId: string,
  winnerTeamId: string,
  method: MatchResultMethod,
  finalizedByUserId: string | null,
  notes?: string | null
) {
  const match = await tx.match.findFirst({
    where: { id: matchId, tenantId },
    include: { category: true },
  });
  if (!match) throw notFound('Match not found');
  if (match.status === MatchStatus.COMPLETED) throw badRequest('Match already finalized');

  const nextRound = match.roundNumber + 1;
  const nextMatchNumber = Math.ceil(match.matchNumber / 2);
  const slotA = match.matchNumber % 2 === 1;

  await tx.matchResult.upsert({
    where: { matchId },
    create: {
      tenantId,
      matchId,
      winnerTeamId,
      method,
      notes: notes ?? undefined,
      finalizedByUserId: finalizedByUserId ?? 'system',
      finalizedAt: new Date(),
    },
    update: {
      winnerTeamId,
      method,
      notes: notes ?? undefined,
      finalizedByUserId: finalizedByUserId ?? 'system',
      finalizedAt: new Date(),
    },
  });

  await tx.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.COMPLETED },
  });

  const nextMatch = await tx.match.findFirst({
    where: { categoryId: match.categoryId, roundNumber: nextRound, matchNumber: nextMatchNumber },
  });

  if (nextMatch) {
    const update: { teamAId?: string; teamBId?: string; status?: MatchStatus } = slotA
      ? { teamAId: winnerTeamId }
      : { teamBId: winnerTeamId };
    const updated = await tx.match.update({
      where: { id: nextMatch.id },
      data: update,
    });
    const bothFilled = !!updated.teamAId && !!updated.teamBId;
    if (bothFilled) {
      await tx.match.update({
        where: { id: nextMatch.id },
        data: { status: MatchStatus.READY },
      });
    }
  }

  const stats = await tx.categoryStats.findUnique({ where: { categoryId: match.categoryId } });
  if (stats) {
    const isFinal = !nextMatch;
    await tx.categoryStats.update({
      where: { categoryId: match.categoryId },
      data: {
        completedMatches: { increment: 1 },
        ...(isFinal && { championTeamId: winnerTeamId }),
        lastUpdatedAt: new Date(),
      },
    });
  }
}

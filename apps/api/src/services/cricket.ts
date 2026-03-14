import type { PrismaClient } from '@bharatathlete/db';
import { CricketMatchStatus, CricketResultType } from '@bharatathlete/db';
import { badRequest, notFound } from '../lib/errors.js';
import type { z } from 'zod';
import type { createMatchSchema, updateInningsSchema, finalizeSchema } from '../schemas/cricket.js';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function createMatch(
  tx: Tx,
  tenantId: string,
  body: z.infer<typeof createMatchSchema>
) {
  const [competition, category] = await Promise.all([
    tx.competition.findFirst({
      where: { id: body.competitionId, tenantId },
      select: { id: true },
    }),
    tx.category.findFirst({
      where: { id: body.categoryId, tenantId },
      include: { competitionSport: { include: { sport: true } } },
    }),
  ]);
  if (!competition) throw notFound('Competition not found');
  if (!category) throw notFound('Category not found');
  if (category.competitionSport.competitionId !== body.competitionId) {
    throw badRequest('Category does not belong to this competition');
  }
  if (category.competitionSport.sport.scoringModel !== 'CRICKET_LITE') {
    throw badRequest('Category sport must be Cricket (CRICKET_LITE)');
  }

  const teamA = await tx.team.findFirst({
    where: { id: body.teamAId, categoryId: body.categoryId, tenantId },
  });
  const teamB = await tx.team.findFirst({
    where: { id: body.teamBId, categoryId: body.categoryId, tenantId },
  });
  if (!teamA || !teamB) throw badRequest('Both teams must belong to the selected category');

  const tossWinnerBatsFirst = body.tossDecision === 'BAT';
  const innings1BattingId = tossWinnerBatsFirst ? body.tossWinnerTeamId : (body.tossWinnerTeamId === body.teamAId ? body.teamBId : body.teamAId);
  const innings1BowlingId = tossWinnerBatsFirst ? (body.tossWinnerTeamId === body.teamAId ? body.teamBId : body.teamAId) : body.tossWinnerTeamId;

  const scheduledAt = body.scheduledAt
    ? typeof body.scheduledAt === 'string'
      ? new Date(body.scheduledAt)
      : body.scheduledAt
    : undefined;

  const match = await tx.cricketMatch.create({
    data: {
      tenantId,
      competitionId: body.competitionId,
      categoryId: body.categoryId,
      teamAId: body.teamAId,
      teamBId: body.teamBId,
      oversLimit: body.oversLimit,
      ballsPerOver: body.ballsPerOver ?? 6,
      tossWinnerTeamId: body.tossWinnerTeamId,
      tossDecision: body.tossDecision as 'BAT' | 'BOWL',
      status: CricketMatchStatus.SCHEDULED,
      notes: body.notes ?? undefined,
      scheduledAt,
      innings: {
        create: [
          {
            tenantId,
            inningsNumber: 1,
            battingTeamId: innings1BattingId,
            bowlingTeamId: innings1BowlingId,
          },
          {
            tenantId,
            inningsNumber: 2,
            battingTeamId: innings1BowlingId,
            bowlingTeamId: innings1BattingId,
            target: 1,
          },
        ],
      },
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

  return match;
}

export async function updateInnings(
  tx: Tx,
  tenantId: string,
  matchId: string,
  inningsNumber: 1 | 2,
  body: z.infer<typeof updateInningsSchema>
) {
  const match = await tx.cricketMatch.findFirst({
    where: { id: matchId, tenantId },
    include: { innings: { orderBy: { inningsNumber: 'asc' } } },
  });
  if (!match) throw notFound('Cricket match not found');

  const innings = match.innings.find((i) => i.inningsNumber === inningsNumber);
  if (!innings) throw notFound('Innings not found');

  let legalBalls = body.legalBalls;
  if (legalBalls == null && body.overs != null && body.balls != null) {
    if (body.balls < 0 || body.balls > 5) throw badRequest('Balls must be 0–5');
    legalBalls = body.overs * (match.ballsPerOver || 6) + body.balls;
  }
  if (legalBalls != null && legalBalls < 0) throw badRequest('Invalid legal balls');

  const data: {
    runs?: number;
    wickets?: number;
    legalBalls?: number;
    wides?: number;
    noBalls?: number;
    byes?: number;
    legByes?: number;
    fours?: number;
    sixes?: number;
    completed?: boolean;
    target?: number;
  } = {};
  if (body.runs != null) data.runs = body.runs;
  if (body.wickets != null) data.wickets = body.wickets;
  if (legalBalls != null) data.legalBalls = legalBalls;
  if (body.wides != null) data.wides = body.wides;
  if (body.noBalls != null) data.noBalls = body.noBalls;
  if (body.byes != null) data.byes = body.byes;
  if (body.legByes != null) data.legByes = body.legByes;
  if (body.fours != null) data.fours = body.fours;
  if (body.sixes != null) data.sixes = body.sixes;
  if (body.completed != null) data.completed = body.completed;
  if (body.target != null && inningsNumber === 2) data.target = body.target;

  const extras = (data.wides ?? innings.wides) + (data.noBalls ?? innings.noBalls) + (data.byes ?? innings.byes) + (data.legByes ?? innings.legByes);
  const runs = data.runs ?? innings.runs;
  if (runs < extras) throw badRequest('Runs must be at least total extras');

  const updated = await tx.cricketInnings.update({
    where: { id: innings.id },
    data,
  });
  return updated;
}

export function computeResult(
  _match: { ballsPerOver: number },
  innings1: { runs: number; completed: boolean },
  innings2: {
    runs: number;
    wickets: number;
    completed: boolean;
    target: number | null;
    battingTeamId: string;
    bowlingTeamId: string;
  }
): { winnerTeamId: string | null; resultType: 'NORMAL' | 'TIE' | 'TBD'; marginText: string } {
  const target = innings2.target ?? innings1.runs + 1;
  if (innings2.runs >= target) {
    const wicketsRemaining = 10 - innings2.wickets;
    return {
      winnerTeamId: innings2.battingTeamId,
      resultType: 'NORMAL',
      marginText: `won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`,
    };
  }
  if (innings2.completed && innings2.runs < target) {
    const margin = target - 1 - innings2.runs;
    return {
      winnerTeamId: innings2.bowlingTeamId,
      resultType: 'NORMAL',
      marginText: `won by ${margin} run${margin !== 1 ? 's' : ''}`,
    };
  }
  if (innings2.completed && innings2.runs === target - 1) {
    return { winnerTeamId: null, resultType: 'TIE', marginText: 'Match tied' };
  }
  return { winnerTeamId: null, resultType: 'TBD', marginText: '' };
}

export async function finalize(
  tx: Tx,
  tenantId: string,
  matchId: string,
  body: z.infer<typeof finalizeSchema>,
  userId: string
) {
  const match = await tx.cricketMatch.findFirst({
    where: { id: matchId, tenantId },
    include: {
      innings: { orderBy: { inningsNumber: 'asc' }, include: { battingTeam: true, bowlingTeam: true } },
    },
  });
  if (!match) throw notFound('Cricket match not found');

  const status = body.status as CricketMatchStatus;
  const innings1 = match.innings[0];
  const innings2 = match.innings[1];
  if (!innings1 || !innings2) throw badRequest('Match has invalid innings');

  if (status === CricketMatchStatus.COMPLETED) {
    if (!innings1.completed || !innings2.completed) {
      throw badRequest('Both innings must be completed before finalizing as COMPLETED');
    }
    const { winnerTeamId, resultType, marginText } = computeResult(match, innings1, innings2);

    await tx.cricketMatch.update({
      where: { id: matchId },
      data: {
        status: CricketMatchStatus.COMPLETED,
        winnerTeamId,
        resultType: resultType as CricketResultType,
        notes: [body.reason, marginText].filter(Boolean).join(' – ') || undefined,
      },
    });
  } else {
    const reason = body.reason?.trim();
    if (!reason) throw badRequest('Reason is required for TBD, NO_RESULT, or ABANDONED');
    await tx.cricketMatch.update({
      where: { id: matchId },
      data: {
        status,
        resultType: status === 'TBD' ? CricketResultType.TBD : CricketResultType.NO_RESULT,
        notes: reason,
      },
    });
  }

  const updated = await tx.cricketMatch.findFirst({
    where: { id: matchId, tenantId },
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
  return updated!;
}

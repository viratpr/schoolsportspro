import { z } from 'zod';

export const createMatchSchema = z
  .object({
    competitionId: z.string().cuid(),
    categoryId: z.string().cuid(),
    teamAId: z.string().cuid(),
    teamBId: z.string().cuid(),
    oversLimit: z.number().int().min(1).max(999),
    ballsPerOver: z.number().int().min(1).max(10).default(6),
    tossWinnerTeamId: z.string().cuid(),
    tossDecision: z.enum(['BAT', 'BOWL']),
    scheduledAt: z.union([z.string(), z.date()]).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((b) => b.teamAId !== b.teamBId, { message: 'Team A and Team B must be different' })
  .refine(
    (b) => b.tossWinnerTeamId === b.teamAId || b.tossWinnerTeamId === b.teamBId,
    { message: 'Toss winner must be Team A or Team B' }
  );

export const updateMatchSchema = z.object({
  oversLimit: z.number().int().min(1).max(999).optional(),
  ballsPerOver: z.number().int().min(1).max(10).optional(),
  tossWinnerTeamId: z.string().cuid().optional(),
  tossDecision: z.enum(['BAT', 'BOWL']).optional(),
  scheduledAt: z.string().datetime().optional().or(z.date()).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInningsSchema = z
  .object({
    runs: z.number().int().min(0).optional(),
    wickets: z.number().int().min(0).max(10).optional(),
    legalBalls: z.number().int().min(0).optional(),
    overs: z.number().int().min(0).optional(),
    balls: z.number().int().min(0).max(5).optional(),
    wides: z.number().int().min(0).optional(),
    noBalls: z.number().int().min(0).optional(),
    byes: z.number().int().min(0).optional(),
    legByes: z.number().int().min(0).optional(),
    fours: z.number().int().min(0).optional(),
    sixes: z.number().int().min(0).optional(),
    completed: z.boolean().optional(),
    target: z.number().int().min(0).optional(),
  })
  .refine(
    (b) => {
      if (b.runs == null) return true;
      const extras = (b.wides ?? 0) + (b.noBalls ?? 0) + (b.byes ?? 0) + (b.legByes ?? 0);
      return b.runs >= extras;
    },
    { message: 'Runs must be at least total extras' }
  );

export const finalizeSchema = z
  .object({
    status: z.enum(['COMPLETED', 'TBD', 'NO_RESULT', 'ABANDONED']),
    reason: z.string().max(2000).optional(),
  })
  .refine(
    (b) => b.status === 'COMPLETED' || (b.reason != null && b.reason.trim().length > 0),
    { message: 'Reason is required for TBD, NO_RESULT, or ABANDONED' }
  );

export const cricketMatchIdParam = z.object({ id: z.string().cuid() });
export const inningsNumberParam = z.object({ inningsNumber: z.coerce.number().int().min(1).max(2) });

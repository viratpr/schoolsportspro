import { z } from 'zod';

export const scorecardPlayerEntrySchema = z.object({
  studentId: z.string().cuid(),
  displayValue: z.string().optional(),
  numericValue: z.number().optional(),
});

export const scorecardPlayersSchema = z
  .object({
    teamA: z.object({ players: z.array(scorecardPlayerEntrySchema) }).optional(),
    teamB: z.object({ players: z.array(scorecardPlayerEntrySchema) }).optional(),
  })
  .partial();

export const simplePointsScoreSchema = z.object({
  teamAScore: z.number(),
  teamBScore: z.number(),
  periods: z.array(z.object({ label: z.string().optional(), teamAScore: z.number(), teamBScore: z.number() })).optional(),
});

export const setsScoreSchema = z.object({
  sets: z.array(z.object({ teamAScore: z.number(), teamBScore: z.number() })).min(1),
});

export const timeDistanceScoreSchema = z.object({
  teamAValue: z.number().optional(),
  teamBValue: z.number().optional(),
  teamAValues: z.array(z.number()).optional(),
  teamBValues: z.array(z.number()).optional(),
  type: z.enum(['TIME', 'DISTANCE']).optional(),
  unit: z.string().optional(),
  higherIsBetter: z.boolean().optional(),
});

export const scorecardJsonPayloadSchema = z
  .object({
    players: scorecardPlayersSchema.optional(),
    simplePoints: simplePointsScoreSchema.optional(),
    sets: setsScoreSchema.optional(),
    timeDistance: timeDistanceScoreSchema.optional(),
    teamA: z.object({ players: z.array(scorecardPlayerEntrySchema) }).optional(),
    teamB: z.object({ players: z.array(scorecardPlayerEntrySchema) }).optional(),
  })
  .passthrough();

export const scorecardUpsertBodySchema = z.object({
  scorecardJson: z.union([scorecardJsonPayloadSchema, z.record(z.unknown())]),
  summaryA: z.string().optional(),
  summaryB: z.string().optional(),
  numericScoreA: z.number().optional(),
  numericScoreB: z.number().optional(),
  scoringModel: z.enum(['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE']).optional(),
});

// Template-driven scorecard (MatchScorecard)
export const templateScorecardPlayerLineSchema = z.object({
  teamId: z.string().cuid(),
  studentId: z.string().cuid().optional().nullable(),
  playerName: z.string().optional().nullable(),
  stats: z.record(z.unknown()),
});

export const templateScorecardPutBodySchema = z.object({
  payloadJson: z.record(z.unknown()),
  playerLines: z.array(templateScorecardPlayerLineSchema).optional().default([]),
});


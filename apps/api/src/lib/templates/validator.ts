import { z } from 'zod';

const fieldDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['number', 'text', 'select', 'array']),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  arrayItem: z.object({ a: z.string(), b: z.string() }).optional(),
});

const playerColumnDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['number', 'text', 'select']),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

const totalRuleDefSchema = z.object({
  columnKey: z.string(),
  aggregate: z.enum(['sum', 'max', 'min']),
  targetKey: z.string().optional(),
});

const winnerRuleDefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SIMPLE_POINTS'), teamScoreKey: z.string() }),
  z.object({
    type: z.literal('SETS'),
    setsWonKey: z.string(),
    setScoresKey: z.string().optional(),
    bestOf: z.number().optional(),
  }),
  z.object({ type: z.literal('CRICKET_LITE'), inningsKey: z.string().optional() }),
  z.object({
    type: z.literal('TIME_DISTANCE'),
    valueKey: z.string(),
    lowerIsBetter: z.boolean(),
  }),
  z.object({
    type: z.literal('ATTEMPTS_BEST_OF'),
    bestKey: z.string(),
    attemptsKey: z.string().optional(),
    higherIsBetter: z.boolean(),
  }),
]);

export const sportScorecardTemplateSchema = z.object({
  sportKey: z.string(),
  displayName: z.string(),
  sportType: z.enum(['TEAM', 'INDIVIDUAL']),
  scoringModel: z.enum(['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE', 'ATTEMPTS_BEST_OF']),
  match: z.object({
    teamFields: z.array(fieldDefSchema),
    sharedFields: z.array(fieldDefSchema).optional(),
    constraints: z.record(z.unknown()).optional(),
    summaryFormat: z.object({ teamLine: z.string() }),
  }),
  players: z
    .object({
      enabled: z.boolean(),
      columns: z.array(playerColumnDefSchema),
      totals: z.array(totalRuleDefSchema).optional(),
    })
    .optional(),
  compute: z.object({
    winnerRule: winnerRuleDefSchema,
    marginRule: z.string().optional(),
  }),
  ui: z
    .object({
      hints: z.array(z.string()).optional(),
      icons: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SportScorecardTemplateParsed = z.infer<typeof sportScorecardTemplateSchema>;

export function validateTemplate(json: unknown): SportScorecardTemplateParsed {
  return sportScorecardTemplateSchema.parse(json);
}

export function parseTemplateSafe(json: unknown): SportScorecardTemplateParsed | null {
  const result = sportScorecardTemplateSchema.safeParse(json);
  return result.success ? result.data : null;
}

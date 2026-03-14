import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  logoUrl: z.string().url().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

/** Optional match format for category templates (singles/doubles/mixed doubles). */
export const matchFormatEnum = z.enum(['SINGLES', 'DOUBLES', 'MIXED_DOUBLES']);

/** Single category template in defaultCategoryTemplatesJson. */
export const categoryTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  gender: z.enum(['BOYS', 'GIRLS', 'MIXED', 'OPEN']),
  eligibility: z.record(z.unknown()).optional().default({}),
  matchFormat: matchFormatEnum.optional(),
});

const createSportBaseSchema = z.object({
  name: z.string().min(1).max(100),
  sportType: z.enum(['TEAM', 'INDIVIDUAL']),
  scoringModel: z.enum(['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE']),
  defaultRulesText: z.string(),
  defaultCategoryTemplatesJson: z.array(categoryTemplateSchema),
  teamConfigJson: z.record(z.unknown()).nullable().optional(),
  matchConfigJson: z.record(z.unknown()).optional(),
});

const validateSportConfig = (
  data: { scoringModel: 'SIMPLE_POINTS' | 'SETS' | 'CRICKET_LITE' | 'TIME_DISTANCE'; matchConfigJson?: Record<string, unknown> },
  ctx: z.RefinementCtx
) => {
  const simplePointsConfigSchema = z.object({
    halves: z.number().int().positive().optional(),
    halfMinutes: z.number().int().positive().optional(),
    quarters: z.number().int().positive().optional(),
    quarterMinutes: z.number().int().positive().optional(),
    tieBreaker: z.string().optional(),
  });
  const setsConfigSchema = z.object({
    bestOfSets: z.number().int().positive().optional(),
    setPoints: z.number().int().positive().optional(),
    decidingSetPoints: z.number().int().positive().optional(),
    winBy: z.number().int().positive().optional(),
    bestOfGames: z.number().int().positive().optional(),
    gamePoints: z.number().int().positive().optional(),
    maxPointCap: z.number().int().positive().optional(),
  });
  const cricketConfigSchema = z.object({
    oversPerInnings: z.number().int().positive().optional(),
    innings: z.number().int().positive().optional(),
    ballPerOver: z.number().int().positive().optional(),
  });
  const timeDistanceConfigSchema = z.object({
    type: z.enum(['TIME', 'DISTANCE']),
    unit: z.string().optional(),
    attempts: z.number().int().positive().optional(),
  });
  const cfg = data.matchConfigJson ?? {};
  const validate = (
    schema: z.ZodTypeAny,
    message: string
  ) => {
    const result = schema.safeParse(cfg);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['matchConfigJson'],
        message,
      });
    }
  };
  if (data.scoringModel === 'SIMPLE_POINTS') validate(simplePointsConfigSchema, 'Invalid SIMPLE_POINTS matchConfigJson');
  if (data.scoringModel === 'SETS') validate(setsConfigSchema, 'Invalid SETS matchConfigJson');
  if (data.scoringModel === 'CRICKET_LITE') validate(cricketConfigSchema, 'Invalid CRICKET_LITE matchConfigJson');
  if (data.scoringModel === 'TIME_DISTANCE') validate(timeDistanceConfigSchema, 'Invalid TIME_DISTANCE matchConfigJson');
};

export const createSportSchema = createSportBaseSchema.superRefine((data, ctx) => {
  validateSportConfig(data, ctx);
});

export const updateSportSchema = createSportBaseSchema.partial().superRefine((data, ctx) => {
  if (!data.scoringModel || !data.matchConfigJson) return;
  const partialCreate = createSportBaseSchema.safeParse({
    name: data.name ?? 'x',
    sportType: data.sportType ?? 'TEAM',
    scoringModel: data.scoringModel,
    defaultRulesText: data.defaultRulesText ?? 'x',
    defaultCategoryTemplatesJson: data.defaultCategoryTemplatesJson ?? [{ name: 'x', gender: 'OPEN', eligibility: {} }],
    teamConfigJson: data.teamConfigJson,
    matchConfigJson: data.matchConfigJson,
  });
  if (!partialCreate.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['matchConfigJson'],
      message: 'Invalid matchConfigJson for the selected scoringModel',
    });
    return;
  }
  validateSportConfig({ scoringModel: data.scoringModel, matchConfigJson: data.matchConfigJson }, ctx);
});

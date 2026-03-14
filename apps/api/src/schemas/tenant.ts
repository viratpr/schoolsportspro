import { z } from 'zod';

export const createStudentSchema = z.object({
  admissionNo: z.string().min(1).max(50),
  fullName: z.string().min(1).max(200),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().datetime().optional(),
  classStandard: z.string().min(1).max(20),
  section: z.string().max(10).optional(),
  house: z.string().max(50).optional(),
  active: z.boolean().optional().default(true),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentSearchSchema = z.object({
  q: z.string().optional(),
  classStandard: z.string().optional(),
  section: z.string().optional(),
  active: z.coerce.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const dateOrDatetime = z.string().min(1).refine(
  (s) => !Number.isNaN(Date.parse(s)),
  { message: 'Invalid date' }
);

export const createCompetitionSchema = z.object({
  name: z.string().min(1).max(200),
  academicYear: z.string().min(1).max(20),
  startDate: dateOrDatetime,
  endDate: dateOrDatetime,
  venue: z.string().max(200).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'LIVE', 'CLOSED']).optional().default('DRAFT'),
});

export const updateCompetitionSchema = createCompetitionSchema.partial();

export const enableSportSchema = z.object({
  sportId: z.string().cuid(),
  enabled: z.boolean().optional().default(true),
  overriddenRulesText: z.string().optional(),
});

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const passwordStrong = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signupSchema = z.object({
  schoolName: z.string().min(1, 'School name required').max(200),
  slug: z
    .string()
    .min(2, 'School code must be at least 2 characters')
    .max(50)
    .toLowerCase()
    .regex(slugRegex, 'Use only lowercase letters, numbers, and hyphens'),
  adminName: z.string().min(1, 'Admin name required').max(200),
  adminEmail: z.string().email('Invalid email'),
  password: passwordStrong,
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  gender: z.enum(['BOYS', 'GIRLS', 'MIXED', 'OPEN']),
  eligibilityJson: z.record(z.unknown()),
  format: z.enum(['KNOCKOUT', 'INDIVIDUAL']),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  coachName: z.string().max(100).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addTeamMemberSchema = z.object({
  studentId: z.string().cuid(),
});

export const addParticipantSchema = z.object({
  studentId: z.string().cuid(),
});

export const bulkParticipantsSchema = z.object({
  studentIds: z.array(z.string().cuid()),
});

/**
 * Per-player score entry in scorecardJson (team sports).
 * Used when registering each player's score in a match.
 */
const scorecardPlayerEntrySchema = z.object({
  studentId: z.string().cuid(),
  displayValue: z.string().optional(),
  numericValue: z.number().optional(),
});

/**
 * Documented shape for scorecardJson when storing per-player scores.
 * teamA/teamB each have an optional list of player scores.
 * Existing summaryA/summaryB can be derived from these or entered manually.
 */
export const scorecardWithPlayersJsonSchema = z
  .object({
    teamA: z
      .object({
        players: z.array(scorecardPlayerEntrySchema),
      })
      .optional(),
    teamB: z
      .object({
        players: z.array(scorecardPlayerEntrySchema),
      })
      .optional(),
  })
  .strict();

/** scorecardJson: either per-player shape or generic object for backward compatibility */
const scorecardJsonSchema = z.union([
  scorecardWithPlayersJsonSchema,
  z.record(z.unknown()),
]);

export const scorecardSchema = z.object({
  scoringModel: z.enum(['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE']),
  scorecardJson: scorecardJsonSchema,
  summaryA: z.string(),
  summaryB: z.string(),
  numericScoreA: z.number().optional(),
  numericScoreB: z.number().optional(),
});

export const finalizeMatchSchema = z.object({
  winnerTeamId: z.string().cuid(),
  method: z.enum(['NORMAL', 'BYE', 'WALKOVER', 'TIEBREAKER']).default('NORMAL'),
  notes: z.string().optional(),
});

export const individualResultSchema = z.object({
  participantEntryId: z.string().cuid(),
  numericValue: z.number(),
  displayValue: z.string(),
  rank: z.number().int().positive(),
});

export const bulkResultsSchema = z.object({
  results: z.array(individualResultSchema),
});

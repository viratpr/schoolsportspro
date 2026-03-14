import type { ScoringModel } from '@bharatathlete/db';
import type { z } from 'zod';
import { scorecardUpsertBodySchema } from '../schemas/scorecard.js';

type ScorecardBody = z.infer<typeof scorecardUpsertBodySchema>;

type NormalizedScorecard = {
  scoringModel: ScoringModel;
  scorecardJson: Record<string, unknown>;
  summaryA: string;
  summaryB: string;
  numericScoreA?: number;
  numericScoreB?: number;
};

type SetsConfig = {
  bestOfSets: number;
  setPoints: number;
  decidingSetPoints: number;
  winBy: number;
  maxPointsCap?: number;
  allowTieBreakOverride?: boolean;
};

type TimeDistanceConfig = {
  type: 'TIME' | 'DISTANCE';
  unit?: string;
  attempts: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function parseSetsConfig(matchConfigJson: unknown): SetsConfig {
  const c = asRecord(matchConfigJson);
  return {
    bestOfSets: Number(c.bestOfSets ?? 3),
    setPoints: Number(c.setPoints ?? c.regularSetPoints ?? 21),
    decidingSetPoints: Number(c.decidingSetPoints ?? 15),
    winBy: Number(c.winBy ?? 2),
    maxPointsCap: c.maxPointsCap != null ? Number(c.maxPointsCap) : undefined,
    allowTieBreakOverride: c.allowTieBreakOverride != null ? Boolean(c.allowTieBreakOverride) : undefined,
  };
}

function parseTimeDistanceConfig(matchConfigJson: unknown): TimeDistanceConfig {
  const c = asRecord(matchConfigJson);
  const rawType = String(c.type ?? 'DISTANCE').toUpperCase();
  return {
    type: rawType === 'TIME' ? 'TIME' : 'DISTANCE',
    unit: typeof c.unit === 'string' ? c.unit : undefined,
    attempts: Number(c.attempts ?? 1),
  };
}

function normalizeSimplePoints(body: ScorecardBody, scorecardJson: Record<string, unknown>): Pick<NormalizedScorecard, 'scorecardJson' | 'summaryA' | 'summaryB' | 'numericScoreA' | 'numericScoreB'> {
  const simplePoints = asRecord(scorecardJson.simplePoints);
  const teamAScore = Number(simplePoints.teamAScore ?? scorecardJson.teamAScore ?? body.numericScoreA ?? 0);
  const teamBScore = Number(simplePoints.teamBScore ?? scorecardJson.teamBScore ?? body.numericScoreB ?? 0);
  return {
    scorecardJson: {
      ...scorecardJson,
      simplePoints: {
        ...simplePoints,
        teamAScore,
        teamBScore,
      },
    },
    summaryA: body.summaryA ?? String(teamAScore),
    summaryB: body.summaryB ?? String(teamBScore),
    numericScoreA: teamAScore,
    numericScoreB: teamBScore,
  };
}

function normalizeSets(body: ScorecardBody, scorecardJson: Record<string, unknown>): Pick<NormalizedScorecard, 'scorecardJson' | 'summaryA' | 'summaryB' | 'numericScoreA' | 'numericScoreB'> {
  const setsBlock = asRecord(scorecardJson.sets);
  const setsCandidate = Array.isArray(setsBlock.sets) ? setsBlock.sets : (Array.isArray(scorecardJson.sets) ? scorecardJson.sets : []);
  const sets = setsCandidate as Array<{ teamAScore?: number; teamBScore?: number }>;
  let wonA = 0;
  let wonB = 0;
  const summaryParts: string[] = [];
  for (const s of sets) {
    const a = Number(s.teamAScore ?? 0);
    const b = Number(s.teamBScore ?? 0);
    if (a > b) wonA += 1;
    if (b > a) wonB += 1;
    summaryParts.push(`${a}-${b}`);
  }
  return {
    scorecardJson: {
      ...scorecardJson,
      sets: { sets: sets.map((s) => ({ teamAScore: Number(s.teamAScore ?? 0), teamBScore: Number(s.teamBScore ?? 0) })) },
    },
    summaryA: body.summaryA ?? `Sets won: ${wonA}${summaryParts.length ? ` (${summaryParts.join(', ')})` : ''}`,
    summaryB: body.summaryB ?? `Sets won: ${wonB}${summaryParts.length ? ` (${summaryParts.join(', ')})` : ''}`,
    numericScoreA: wonA,
    numericScoreB: wonB,
  };
}

function normalizeTimeDistance(body: ScorecardBody, scorecardJson: Record<string, unknown>, matchConfigJson: unknown): Pick<NormalizedScorecard, 'scorecardJson' | 'summaryA' | 'summaryB' | 'numericScoreA' | 'numericScoreB'> {
  const cfg = parseTimeDistanceConfig(matchConfigJson);
  const block = asRecord(scorecardJson.timeDistance);
  const aValuesRaw = Array.isArray(block.teamAValues) ? block.teamAValues as number[] : [];
  const bValuesRaw = Array.isArray(block.teamBValues) ? block.teamBValues as number[] : [];
  const teamAValues = aValuesRaw.length > 0
    ? aValuesRaw.map(Number)
    : [Number(block.teamAValue ?? scorecardJson.teamAValue ?? body.numericScoreA ?? 0)];
  const teamBValues = bValuesRaw.length > 0
    ? bValuesRaw.map(Number)
    : [Number(block.teamBValue ?? scorecardJson.teamBValue ?? body.numericScoreB ?? 0)];
  const higherIsBetter = block.higherIsBetter != null
    ? Boolean(block.higherIsBetter)
    : cfg.type !== 'TIME';
  const bestA = higherIsBetter ? Math.max(...teamAValues) : Math.min(...teamAValues);
  const bestB = higherIsBetter ? Math.max(...teamBValues) : Math.min(...teamBValues);
  const unit = typeof block.unit === 'string' ? block.unit : cfg.unit;
  return {
    scorecardJson: {
      ...scorecardJson,
      timeDistance: {
        ...block,
        type: block.type ?? cfg.type,
        unit,
        higherIsBetter,
        teamAValues,
        teamBValues,
      },
    },
    summaryA: body.summaryA ?? `${bestA}${unit ? ` ${unit}` : ''}`,
    summaryB: body.summaryB ?? `${bestB}${unit ? ` ${unit}` : ''}`,
    numericScoreA: bestA,
    numericScoreB: bestB,
  };
}

export function normalizeScorecardByModel(
  scoringModel: ScoringModel,
  matchConfigJson: unknown,
  body: ScorecardBody
): NormalizedScorecard {
  const scorecardJson = asRecord(body.scorecardJson);
  if (scoringModel === 'SETS') {
    const normalized = normalizeSets(body, scorecardJson);
    const cfg = parseSetsConfig(matchConfigJson);
    return {
      scoringModel,
      ...normalized,
      scorecardJson: {
        ...normalized.scorecardJson,
        config: cfg,
      },
    };
  }
  if (scoringModel === 'TIME_DISTANCE') {
    return { scoringModel, ...normalizeTimeDistance(body, scorecardJson, matchConfigJson) };
  }
  if (scoringModel === 'CRICKET_LITE') {
    return {
      scoringModel,
      scorecardJson,
      summaryA: body.summaryA ?? '',
      summaryB: body.summaryB ?? '',
      numericScoreA: body.numericScoreA,
      numericScoreB: body.numericScoreB,
    };
  }
  return { scoringModel, ...normalizeSimplePoints(body, scorecardJson) };
}


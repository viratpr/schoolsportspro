/**
 * Centralized scoring engine: validate payload against template, compute winner and summaries.
 * All computation stays server-side (middleware/service layer).
 */

import type { SportScorecardTemplate, TemplatePayload, PlayerStatLineInput } from '../templates/types.js';
import { validateTemplate } from '../templates/validator.js';

export interface ComputeResult {
  winnerTeamId: string | null;
  isTie: boolean;
  marginText: string;
  summaryA: string;
  summaryB: string;
  derived: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function substitute(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

function hasSharedField(template: SportScorecardTemplate, key: string): boolean {
  return (template.match.sharedFields ?? []).some((f) => f.key === key);
}

function numberOrUndefined(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function requireNumber(payload: Record<string, unknown>, key: string, label: string): number {
  const n = numberOrUndefined(payload, key);
  if (n == null) throw new Error(`${label} is required and must be a number.`);
  return n;
}

function requireMatchingTotal(
  teamTotal: number,
  components: number[],
  totalLabel: string,
  componentLabel: string
): void {
  const expected = components.reduce((sum, value) => sum + value, 0);
  if (teamTotal !== expected) {
    throw new Error(`${totalLabel} must equal ${componentLabel} total (${expected}).`);
  }
}

/** Validate payload and optional playerLines against template. Throws on invalid. */
export function validatePayload(
  template: SportScorecardTemplate,
  payloadJson: unknown,
  playerLines?: PlayerStatLineInput[]
): void {
  validateTemplate(template);
  const payload = asRecord(payloadJson);
  const match = template.match;
  for (const f of match.teamFields) {
    if (f.required && (payload[f.key] === undefined || payload[f.key] === null))
      throw new Error(`Missing required field: ${f.key}`);
    if (f.type === 'number' && payload[f.key] != null) {
      const n = Number(payload[f.key]);
      if (Number.isNaN(n)) throw new Error(`Invalid number for ${f.key}`);
      if (f.min != null && n < f.min) throw new Error(`${f.key} must be >= ${f.min}`);
      if (f.max != null && n > f.max) throw new Error(`${f.key} must be <= ${f.max}`);
    }
  }
  for (const f of match.sharedFields ?? []) {
    if (f.required && (payload[f.key] === undefined || payload[f.key] === null))
      throw new Error(`Missing required shared field: ${f.key}`);
    if (f.type === 'number' && payload[f.key] != null) {
      const n = Number(payload[f.key]);
      if (Number.isNaN(n)) throw new Error(`Invalid number for ${f.key}`);
      if (f.min != null && n < f.min) throw new Error(`${f.key} must be >= ${f.min}`);
      if (f.max != null && n > f.max) throw new Error(`${f.key} must be <= ${f.max}`);
    }
    if (f.type === 'select' && payload[f.key] != null && f.options?.length) {
      const value = String(payload[f.key]);
      const allowed = new Set(f.options.map((o) => o.value));
      if (!allowed.has(value)) {
        throw new Error(`Invalid option for ${f.key}`);
      }
    }
    if (f.type === 'array' && payload[f.key] != null && !Array.isArray(payload[f.key])) {
      throw new Error(`${f.key} must be an array`);
    }
  }
  if (template.players?.enabled && template.players.columns) {
    for (const line of playerLines ?? []) {
      for (const col of template.players.columns) {
        const v = line.stats[col.key];
        if (col.type === 'number' && v != null) {
          const n = Number(v);
          if (Number.isNaN(n)) throw new Error(`Invalid number for player stat ${col.key}`);
          if (col.min != null && n < col.min) throw new Error(`Player ${col.key} must be >= ${col.min}`);
          if (col.max != null && n > col.max) throw new Error(`Player ${col.key} must be <= ${col.max}`);
        }
      }
    }
  }

  // Volleyball-specific set validations (rally scoring, win-by-2, caps) using template constraints.
  if (template.scoringModel === 'SETS' && template.sportKey === 'volleyball') {
    const constraints = asRecord(template.match.constraints);
    const bestOfSets = Number(constraints.bestOfSets ?? 5);
    const regularSetPoints = Number(constraints.setPoints ?? 25);
    const decidingSetPoints = Number(constraints.decidingSetPoints ?? 15);
    const winBy = Number(constraints.winBy ?? 2);
    const maxPointsCap = constraints.maxPointsCap != null ? Number(constraints.maxPointsCap) : undefined;
    const allowTieBreakOverride = constraints.allowTieBreakOverride != null
      ? Boolean(constraints.allowTieBreakOverride)
      : false;

    const rawSets = payload.setScores;
    const sets = Array.isArray(rawSets) ? rawSets : [];
    if (sets.length === 0) {
      throw new Error('At least one set score is required for volleyball.');
    }

    const maxSetsAllowed = bestOfSets;
    if (!allowTieBreakOverride && sets.length > maxSetsAllowed) {
      throw new Error(`Too many sets provided for a best-of-${bestOfSets} volleyball match.`);
    }

    for (let i = 0; i < sets.length; i += 1) {
      const s = asRecord(sets[i]);
      const a = Number(s.teamAScore ?? s.a ?? s.teamA ?? 0);
      const b = Number(s.teamBScore ?? s.b ?? s.teamB ?? 0);
      const setNumber = i + 1;
      const isDecidingSet = setNumber === bestOfSets;
      const targetPoints = isDecidingSet ? decidingSetPoints : regularSetPoints;
      const maxScore = Math.max(a, b);
      const minScore = Math.min(a, b);

      if (!allowTieBreakOverride) {
        if (maxScore < targetPoints) {
          throw new Error(`Set ${setNumber}: winning team must reach at least ${targetPoints} points.`);
        }
        if (maxPointsCap != null && maxScore > maxPointsCap) {
          throw new Error(`Set ${setNumber}: score cannot exceed cap of ${maxPointsCap} points.`);
        }
        const diff = maxScore - minScore;
        const reachedCap = maxPointsCap != null && maxScore === maxPointsCap;
        if (!reachedCap && diff < winBy) {
          throw new Error(`Set ${setNumber}: winner must lead by at least ${winBy} points.`);
        }
      }
    }
  }

  // International invariant checks for non-volleyball templates.
  if (hasSharedField(template, 'q1TeamA') || hasSharedField(template, 'q1TeamB')) {
    const scoreA = requireNumber(payload, 'teamAScore', 'Team A score');
    const scoreB = requireNumber(payload, 'teamBScore', 'Team B score');
    const q1A = requireNumber(payload, 'q1TeamA', 'Q1 Team A points');
    const q2A = requireNumber(payload, 'q2TeamA', 'Q2 Team A points');
    const q3A = requireNumber(payload, 'q3TeamA', 'Q3 Team A points');
    const q4A = requireNumber(payload, 'q4TeamA', 'Q4 Team A points');
    const q1B = requireNumber(payload, 'q1TeamB', 'Q1 Team B points');
    const q2B = requireNumber(payload, 'q2TeamB', 'Q2 Team B points');
    const q3B = requireNumber(payload, 'q3TeamB', 'Q3 Team B points');
    const q4B = requireNumber(payload, 'q4TeamB', 'Q4 Team B points');
    const otA = numberOrUndefined(payload, 'otTeamA') ?? 0;
    const otB = numberOrUndefined(payload, 'otTeamB') ?? 0;
    requireMatchingTotal(scoreA, [q1A, q2A, q3A, q4A, otA], 'Team A score', 'quarter/OT');
    requireMatchingTotal(scoreB, [q1B, q2B, q3B, q4B, otB], 'Team B score', 'quarter/OT');
  }

  if (hasSharedField(template, 'half1TeamA') || hasSharedField(template, 'half1TeamB')) {
    const scoreA = requireNumber(payload, 'teamAScore', 'Team A score');
    const scoreB = requireNumber(payload, 'teamBScore', 'Team B score');
    const half1A = requireNumber(payload, 'half1TeamA', '1st half Team A goals');
    const half2A = requireNumber(payload, 'half2TeamA', '2nd half Team A goals');
    const half1B = requireNumber(payload, 'half1TeamB', '1st half Team B goals');
    const half2B = requireNumber(payload, 'half2TeamB', '2nd half Team B goals');
    requireMatchingTotal(scoreA, [half1A, half2A], 'Team A score', 'half');
    requireMatchingTotal(scoreB, [half1B, half2B], 'Team B score', 'half');
  }

  if (hasSharedField(template, 'inning1A') || hasSharedField(template, 'inning1B')) {
    const scoreA = requireNumber(payload, 'teamAScore', 'Team A score');
    const scoreB = requireNumber(payload, 'teamBScore', 'Team B score');
    const inningsA = [1, 2, 3, 4, 5, 6, 7].map((i) => numberOrUndefined(payload, `inning${i}A`) ?? 0);
    const inningsB = [1, 2, 3, 4, 5, 6, 7].map((i) => numberOrUndefined(payload, `inning${i}B`) ?? 0);
    requireMatchingTotal(scoreA, inningsA, 'Team A score', 'innings');
    requireMatchingTotal(scoreB, inningsB, 'Team B score', 'innings');
  }

  if (hasSharedField(template, 'set1GamesA') || hasSharedField(template, 'set1GamesB')) {
    const setPairs: Array<[number, number]> = [
      [
        numberOrUndefined(payload, 'set1GamesA') ?? 0,
        numberOrUndefined(payload, 'set1GamesB') ?? 0,
      ],
      [
        numberOrUndefined(payload, 'set2GamesA') ?? 0,
        numberOrUndefined(payload, 'set2GamesB') ?? 0,
      ],
      [
        numberOrUndefined(payload, 'set3GamesA') ?? 0,
        numberOrUndefined(payload, 'set3GamesB') ?? 0,
      ],
    ];
    const hasAnySetGames = setPairs.some(([a, b]) => a > 0 || b > 0);
    if (!hasAnySetGames) {
      throw new Error('At least one tennis set game score is required.');
    }
    if (Array.isArray(payload.setScores)) {
      const providedSetScores = payload.setScores as Array<Record<string, unknown>>;
      const comparableSets = Math.min(providedSetScores.length, setPairs.length);
      for (let i = 0; i < comparableSets; i += 1) {
        const set = asRecord(providedSetScores[i]);
        const fromSetScoresA = Number(set.teamAScore ?? set.a ?? set.teamA ?? 0);
        const fromSetScoresB = Number(set.teamBScore ?? set.b ?? set.teamB ?? 0);
        const [gamesA, gamesB] = setPairs[i];
        if (gamesA !== fromSetScoresA || gamesB !== fromSetScoresB) {
          throw new Error(`Tennis set ${i + 1} games must match setScores.`);
        }
      }
    }
  }

  if (hasSharedField(template, 'period1A') || hasSharedField(template, 'period1B')) {
    const scoreA = requireNumber(payload, 'teamAScore', 'Competitor A points');
    const scoreB = requireNumber(payload, 'teamBScore', 'Competitor B points');
    const period1A = requireNumber(payload, 'period1A', 'Period 1 points (A)');
    const period2A = requireNumber(payload, 'period2A', 'Period 2 points (A)');
    const period1B = requireNumber(payload, 'period1B', 'Period 1 points (B)');
    const period2B = requireNumber(payload, 'period2B', 'Period 2 points (B)');
    const fallA = String(payload.fallA ?? 'NO');
    const fallB = String(payload.fallB ?? 'NO');
    if (fallA === 'YES' && fallB === 'YES') {
      throw new Error('Both wrestlers cannot win by fall in the same bout.');
    }
    if (fallA !== 'YES' && fallB !== 'YES') {
      requireMatchingTotal(scoreA, [period1A, period2A], 'Competitor A points', 'period');
      requireMatchingTotal(scoreB, [period1B, period2B], 'Competitor B points', 'period');
    }
  }

  if (hasSharedField(template, 'laneA') || hasSharedField(template, 'laneB')) {
    const laneA = numberOrUndefined(payload, 'laneA');
    const laneB = numberOrUndefined(payload, 'laneB');
    if (laneA != null && laneB != null && laneA === laneB) {
      throw new Error('Athletics lane assignments must be different.');
    }
    const reactionTimeA = numberOrUndefined(payload, 'reactionTimeA');
    const reactionTimeB = numberOrUndefined(payload, 'reactionTimeB');
    if (reactionTimeA != null && reactionTimeA >= 1) {
      throw new Error('Reaction Time A must be below 1 second.');
    }
    if (reactionTimeB != null && reactionTimeB >= 1) {
      throw new Error('Reaction Time B must be below 1 second.');
    }
  }

  if (hasSharedField(template, 'strokeViolationA') || hasSharedField(template, 'strokeViolationB')) {
    const split25mA = numberOrUndefined(payload, 'split25mA');
    const split25mB = numberOrUndefined(payload, 'split25mB');
    const finalA = numberOrUndefined(payload, 'teamAValue');
    const finalB = numberOrUndefined(payload, 'teamBValue');
    if (split25mA != null && finalA != null && split25mA > finalA) {
      throw new Error('Split 25m A cannot exceed final time A.');
    }
    if (split25mB != null && finalB != null && split25mB > finalB) {
      throw new Error('Split 25m B cannot exceed final time B.');
    }
    const strokeViolationA = String(payload.strokeViolationA ?? 'NO');
    const strokeViolationB = String(payload.strokeViolationB ?? 'NO');
    const dqReasonA = String(payload.dqReasonA ?? '').trim();
    const dqReasonB = String(payload.dqReasonB ?? '').trim();
    if (strokeViolationA === 'YES' && !dqReasonA) {
      throw new Error('DQ reason is required for swimmer A when stroke violation is YES.');
    }
    if (strokeViolationB === 'YES' && !dqReasonB) {
      throw new Error('DQ reason is required for swimmer B when stroke violation is YES.');
    }
  }
}

/** Compute winner, margin, summaries and derived stats from template + payload + playerLines. */
export function compute(
  template: SportScorecardTemplate,
  payloadJson: unknown,
  playerLines: PlayerStatLineInput[],
  teamAId: string,
  teamBId: string
): ComputeResult {
  const payload = asRecord(payloadJson);
  const rule = template.compute.winnerRule;

  if (rule.type === 'SIMPLE_POINTS') {
    return simplePointsCalculator(payload, template.match.summaryFormat, teamAId, teamBId);
  }
  if (rule.type === 'SETS') {
    return setsCalculator(payload, template.match.summaryFormat, rule, teamAId, teamBId);
  }
  if (rule.type === 'CRICKET_LITE') {
    return cricketLiteCalculator(payload, template.match.summaryFormat, teamAId, teamBId);
  }
  if (rule.type === 'TIME_DISTANCE') {
    return timeDistanceCalculator(payload, rule, template.match.summaryFormat, teamAId, teamBId);
  }
  if (rule.type === 'ATTEMPTS_BEST_OF') {
    return attemptsBestOfCalculator(payload, rule, template.match.summaryFormat, teamAId, teamBId);
  }

  return {
    winnerTeamId: null,
    isTie: true,
    marginText: '',
    summaryA: '',
    summaryB: '',
    derived: {},
  };
}

function simplePointsCalculator(
  payload: Record<string, unknown>,
  summaryFormat: { teamLine: string },
  teamAId: string,
  teamBId: string
): ComputeResult {
  const teamAObj = asRecord(payload.teamA ?? payload['teamA']);
  const teamBObj = asRecord(payload.teamB ?? payload['teamB']);
  const scoreA = Number(
    payload.teamAScore ??
      payload['teamAScore'] ??
      teamAObj.score ??
      teamAObj['score'] ??
      payload.scoreA ??
      payload['scoreA'] ??
      0
  );
  const scoreB = Number(
    payload.teamBScore ??
      payload['teamBScore'] ??
      teamBObj.score ??
      teamBObj['score'] ??
      payload.scoreB ??
      payload['scoreB'] ??
      0
  );
  const summaryA = substitute(summaryFormat.teamLine, { score: scoreA });
  const summaryB = substitute(summaryFormat.teamLine, { score: scoreB });
  let winnerTeamId: string | null = null;
  let marginText = '';
  if (scoreA > scoreB) {
    winnerTeamId = teamAId;
    marginText = `by ${scoreA - scoreB} points`;
  } else if (scoreB > scoreA) {
    winnerTeamId = teamBId;
    marginText = `by ${scoreB - scoreA} points`;
  } else {
    marginText = 'Tie';
  }
  return {
    winnerTeamId,
    isTie: scoreA === scoreB,
    marginText,
    summaryA,
    summaryB,
    derived: { scoreA, scoreB },
  };
}

function setsCalculator(
  payload: Record<string, unknown>,
  summaryFormat: { teamLine: string },
  rule: { setScoresKey?: string; bestOf?: number },
  teamAId: string,
  teamBId: string
): ComputeResult {
  const setScoresKey = rule.setScoresKey ?? 'setScores';
  const raw = payload[setScoresKey];
  const arr = Array.isArray(raw) ? raw : [];
  const bestOf = rule.bestOf && rule.bestOf > 0 ? rule.bestOf : undefined;
  const scoringSets = bestOf ? arr.slice(0, bestOf) : arr;
  let setsWonA = 0;
  let setsWonB = 0;
  const parts: string[] = [];
  for (const s of scoringSets) {
    const r = asRecord(s);
    const a = Number(r.teamAScore ?? r.a ?? r.teamA ?? 0);
    const b = Number(r.teamBScore ?? r.b ?? r.teamB ?? 0);
    if (a > b) setsWonA += 1;
    if (b > a) setsWonB += 1;
    parts.push(`${a}-${b}`);
  }
  const setScores = parts.join(', ');
  const summaryA = substitute(summaryFormat.teamLine, { setsWon: setsWonA, setScores });
  const summaryB = substitute(summaryFormat.teamLine, { setsWon: setsWonB, setScores });
  let winnerTeamId: string | null = null;
  let marginText = '';
  if (setsWonA > setsWonB) {
    winnerTeamId = teamAId;
    marginText = `Sets ${setsWonA}-${setsWonB}`;
  } else if (setsWonB > setsWonA) {
    winnerTeamId = teamBId;
    marginText = `Sets ${setsWonB}-${setsWonA}`;
  } else {
    marginText = 'Tie';
  }
  return {
    winnerTeamId,
    isTie: setsWonA === setsWonB,
    marginText,
    summaryA,
    summaryB,
    derived: { setsWonA, setsWonB, setScores, setCount: arr.length },
  };
}

function cricketLiteCalculator(
  payload: Record<string, unknown>,
  summaryFormat: { teamLine: string },
  teamAId: string,
  teamBId: string
): ComputeResult {
  const inningsArray = Array.isArray(payload.innings ?? payload['innings'])
    ? ((payload.innings ?? payload['innings']) as unknown[])
    : [];
  const innings1 = asRecord(payload.innings1 ?? payload['innings1'] ?? inningsArray[0]);
  const innings2 = asRecord(payload.innings2 ?? payload['innings2'] ?? inningsArray[1]);
  const runs1 = Number(innings1.runs ?? 0);
  const wickets1 = Number(innings1.wickets ?? 0);
  const overs1 = Number(innings1.overs ?? innings1.legalBalls ?? 0);
  const runs2 = Number(innings2.runs ?? 0);
  const wickets2 = Number(innings2.wickets ?? 0);
  const overs2 = Number(innings2.overs ?? innings2.legalBalls ?? 0);
  const target = runs1 + 1;
  const summaryA = substitute(summaryFormat.teamLine, {
    runs: runs1,
    wickets: wickets1,
    overs: overs1,
    R: runs1,
    W: wickets1,
    O: overs1,
  });
  const summaryB = substitute(summaryFormat.teamLine, {
    runs: runs2,
    wickets: wickets2,
    overs: overs2,
    R: runs2,
    W: wickets2,
    O: overs2,
  });
  let winnerTeamId: string | null = null;
  let marginText = '';
  if (runs2 >= target) {
    winnerTeamId = teamBId;
    marginText = `by ${10 - wickets2} wickets`;
  } else if (runs1 > runs2 && (overs2 > 0 || wickets2 >= 10)) {
    winnerTeamId = teamAId;
    marginText = `by ${target - 1 - runs2} runs`;
  } else if (runs1 === runs2) {
    marginText = 'Tie';
  } else {
    marginText = 'In progress or TBD';
  }
  return {
    winnerTeamId,
    isTie: runs1 === runs2,
    marginText,
    summaryA,
    summaryB,
    derived: { runs1, wickets1, overs1, runs2, wickets2, overs2, target },
  };
}

function timeDistanceCalculator(
  payload: Record<string, unknown>,
  rule: { valueKey: string; lowerIsBetter: boolean },
  summaryFormat: { teamLine: string },
  teamAId: string,
  teamBId: string
): ComputeResult {
  const key = rule.valueKey;
  const teamAObj = asRecord(payload.teamA ?? payload['teamA']);
  const teamBObj = asRecord(payload.teamB ?? payload['teamB']);
  const valA = Number(
    payload.teamAValue ??
      payload['teamAValue'] ??
      (teamAObj as Record<string, unknown>)[key] ??
      payload[`${key}A`] ??
      payload[`${key}a`] ??
      0
  );
  const valB = Number(
    payload.teamBValue ??
      payload['teamBValue'] ??
      (teamBObj as Record<string, unknown>)[key] ??
      payload[`${key}B`] ??
      payload[`${key}b`] ??
      0
  );
  const summaryA = substitute(summaryFormat.teamLine, { value: valA, score: valA });
  const summaryB = substitute(summaryFormat.teamLine, { value: valB, score: valB });
  let winnerTeamId: string | null = null;
  let marginText = '';
  const aWins = rule.lowerIsBetter ? valA < valB : valA > valB;
  const bWins = rule.lowerIsBetter ? valB < valA : valB > valA;
  if (aWins) {
    winnerTeamId = teamAId;
    marginText = rule.lowerIsBetter ? `by ${valB - valA}` : `by ${valA - valB}`;
  } else if (bWins) {
    winnerTeamId = teamBId;
    marginText = rule.lowerIsBetter ? `by ${valA - valB}` : `by ${valB - valA}`;
  } else {
    marginText = 'Tie';
  }
  return {
    winnerTeamId,
    isTie: valA === valB,
    marginText,
    summaryA,
    summaryB,
    derived: { teamAValue: valA, teamBValue: valB },
  };
}

function attemptsBestOfCalculator(
  payload: Record<string, unknown>,
  rule: { bestKey: string; higherIsBetter: boolean },
  summaryFormat: { teamLine: string },
  teamAId: string,
  teamBId: string
): ComputeResult {
  const teamAObj = asRecord(payload.teamA ?? payload['teamA']);
  const teamBObj = asRecord(payload.teamB ?? payload['teamB']);
  const bestA = Number(
    payload.teamABest ??
      payload['teamABest'] ??
      teamAObj.best ??
      teamAObj['best'] ??
      payload.bestA ??
      payload['bestA'] ??
      0
  );
  const bestB = Number(
    payload.teamBBest ??
      payload['teamBBest'] ??
      teamBObj.best ??
      teamBObj['best'] ??
      payload.bestB ??
      payload['bestB'] ??
      0
  );
  const summaryA = substitute(summaryFormat.teamLine, { best: bestA, score: bestA });
  const summaryB = substitute(summaryFormat.teamLine, { best: bestB, score: bestB });
  let winnerTeamId: string | null = null;
  let marginText = '';
  if (rule.higherIsBetter ? bestA > bestB : bestA < bestB) {
    winnerTeamId = teamAId;
    marginText = `by ${Math.abs(bestA - bestB)}`;
  } else if (rule.higherIsBetter ? bestB > bestA : bestB < bestA) {
    winnerTeamId = teamBId;
    marginText = `by ${Math.abs(bestB - bestA)}`;
  } else {
    marginText = 'Tie';
  }
  return {
    winnerTeamId,
    isTie: bestA === bestB,
    marginText,
    summaryA,
    summaryB,
    derived: { bestA, bestB },
  };
}

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
  const scoreA = Number(payload.teamAScore ?? payload.teamA?.score ?? payload.scoreA ?? 0);
  const scoreB = Number(payload.teamBScore ?? payload.teamB?.score ?? payload.scoreB ?? 0);
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
  const innings1 = asRecord(payload.innings1 ?? payload.innings?.[0]);
  const innings2 = asRecord(payload.innings2 ?? payload.innings?.[1]);
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
  const valA = Number(payload.teamAValue ?? payload.teamA?.[key] ?? payload[key + 'A'] ?? 0);
  const valB = Number(payload.teamBValue ?? payload.teamB?.[key] ?? payload[key + 'B'] ?? 0);
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
  const bestA = Number(payload.teamABest ?? payload.teamA?.best ?? payload.bestA ?? 0);
  const bestB = Number(payload.teamBBest ?? payload.teamB?.best ?? payload.bestB ?? 0);
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

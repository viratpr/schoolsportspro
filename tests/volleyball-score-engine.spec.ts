import { test, expect } from '@playwright/test';
import type { SportScorecardTemplate } from '../apps/api/src/lib/templates/types.js';
import { validatePayload, compute } from '../apps/api/src/lib/score-engine/index.js';

const makeVolleyballTemplate = (overrides: Partial<SportScorecardTemplate> = {}): SportScorecardTemplate => ({
  sportKey: 'volleyball',
  displayName: 'Volleyball',
  sportType: 'TEAM',
  scoringModel: 'SETS',
  match: {
    teamFields: [
      {
        key: 'setScores',
        label: 'Set scores',
        type: 'array',
        arrayItem: { a: 'teamAScore', b: 'teamBScore' },
      },
    ],
    constraints: {
      bestOfSets: 5,
      setPoints: 25,
      decidingSetPoints: 15,
      winBy: 2,
      maxPointsCap: 30,
    },
    summaryFormat: { teamLine: '{setsWon} sets ({setScores})' },
  },
  players: undefined,
  compute: {
    winnerRule: { type: 'SETS', setsWonKey: 'setsWon', setScoresKey: 'setScores', bestOf: 5 },
  },
  ui: { hints: [] },
  ...overrides,
});

test.describe('Volleyball score engine (SETS)', () => {
  test('accepts a valid 3–1 volleyball match with win-by-2 sets', () => {
    const template = makeVolleyballTemplate();
    const payload = {
      setScores: [
        { teamAScore: 25, teamBScore: 18 },
        { teamAScore: 22, teamBScore: 25 },
        { teamAScore: 26, teamBScore: 24 },
        { teamAScore: 25, teamBScore: 19 },
      ],
    };

    expect(() => validatePayload(template, payload, [])).not.toThrow();
    const result = compute(template, payload, [], 'TEAM_A', 'TEAM_B');
    expect(result.winnerTeamId).toBe('TEAM_A');
    expect(result.summaryA).toContain('setsWon');
  });

  test('rejects a set that does not respect win-by-2 when under cap', () => {
    const template = makeVolleyballTemplate();
    const payload = {
      setScores: [
        { teamAScore: 25, teamBScore: 24 }, // invalid: diff 1, below cap
      ],
    };

    expect(() => validatePayload(template, payload, [])).toThrow(/winner must lead by at least/i);
  });

  test('rejects too many sets for best-of configuration', () => {
    const template = makeVolleyballTemplate();
    const payload = {
      setScores: Array.from({ length: 6 }).map((_, i) => ({
        teamAScore: 25,
        teamBScore: i % 2 === 0 ? 15 : 27,
      })),
    };

    expect(() => validatePayload(template, payload, [])).toThrow(/too many sets/i);
  });
});


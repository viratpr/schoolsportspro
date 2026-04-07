import { test, expect } from '@playwright/test';
import type { SportScorecardTemplate } from '../apps/api/src/lib/templates/types.js';
import { validatePayload } from '../apps/api/src/lib/score-engine/index.js';

const baseSimplePoints = (
  sportKey: string,
  sharedFields: NonNullable<SportScorecardTemplate['match']['sharedFields']>
): SportScorecardTemplate => ({
  sportKey,
  displayName: `${sportKey} International`,
  sportType: 'TEAM',
  scoringModel: 'SIMPLE_POINTS',
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Score', type: 'number', required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Score', type: 'number', required: true, min: 0 },
    ],
    sharedFields,
    summaryFormat: { teamLine: '{score}' },
  },
  compute: { winnerRule: { type: 'SIMPLE_POINTS', teamScoreKey: 'score' } },
});

const basketballTemplate = baseSimplePoints('basketball', [
  { key: 'q1TeamA', label: 'Q1 A', type: 'number', min: 0 },
  { key: 'q1TeamB', label: 'Q1 B', type: 'number', min: 0 },
  { key: 'q2TeamA', label: 'Q2 A', type: 'number', min: 0 },
  { key: 'q2TeamB', label: 'Q2 B', type: 'number', min: 0 },
  { key: 'q3TeamA', label: 'Q3 A', type: 'number', min: 0 },
  { key: 'q3TeamB', label: 'Q3 B', type: 'number', min: 0 },
  { key: 'q4TeamA', label: 'Q4 A', type: 'number', min: 0 },
  { key: 'q4TeamB', label: 'Q4 B', type: 'number', min: 0 },
  { key: 'otTeamA', label: 'OT A', type: 'number', min: 0 },
  { key: 'otTeamB', label: 'OT B', type: 'number', min: 0 },
]);

const soccerTemplate = baseSimplePoints('soccer', [
  { key: 'half1TeamA', label: 'H1 A', type: 'number', min: 0 },
  { key: 'half1TeamB', label: 'H1 B', type: 'number', min: 0 },
  { key: 'half2TeamA', label: 'H2 A', type: 'number', min: 0 },
  { key: 'half2TeamB', label: 'H2 B', type: 'number', min: 0 },
]);

const baseballTemplate = baseSimplePoints('baseball-softball', [
  { key: 'inning1A', label: 'Inning1 A', type: 'number', min: 0 },
  { key: 'inning1B', label: 'Inning1 B', type: 'number', min: 0 },
  { key: 'inning2A', label: 'Inning2 A', type: 'number', min: 0 },
  { key: 'inning2B', label: 'Inning2 B', type: 'number', min: 0 },
  { key: 'inning3A', label: 'Inning3 A', type: 'number', min: 0 },
  { key: 'inning3B', label: 'Inning3 B', type: 'number', min: 0 },
  { key: 'inning4A', label: 'Inning4 A', type: 'number', min: 0 },
  { key: 'inning4B', label: 'Inning4 B', type: 'number', min: 0 },
  { key: 'inning5A', label: 'Inning5 A', type: 'number', min: 0 },
  { key: 'inning5B', label: 'Inning5 B', type: 'number', min: 0 },
  { key: 'inning6A', label: 'Inning6 A', type: 'number', min: 0 },
  { key: 'inning6B', label: 'Inning6 B', type: 'number', min: 0 },
  { key: 'inning7A', label: 'Inning7 A', type: 'number', min: 0 },
  { key: 'inning7B', label: 'Inning7 B', type: 'number', min: 0 },
]);

const tennisTemplate: SportScorecardTemplate = {
  sportKey: 'tennis',
  displayName: 'Tennis International',
  sportType: 'INDIVIDUAL',
  scoringModel: 'SETS',
  match: {
    teamFields: [{ key: 'setScores', label: 'Set scores', type: 'array', arrayItem: { a: 'teamAScore', b: 'teamBScore' } }],
    sharedFields: [
      { key: 'set1GamesA', label: 'S1 A', type: 'number', min: 0 },
      { key: 'set1GamesB', label: 'S1 B', type: 'number', min: 0 },
      { key: 'set2GamesA', label: 'S2 A', type: 'number', min: 0 },
      { key: 'set2GamesB', label: 'S2 B', type: 'number', min: 0 },
      { key: 'set3GamesA', label: 'S3 A', type: 'number', min: 0 },
      { key: 'set3GamesB', label: 'S3 B', type: 'number', min: 0 },
    ],
    summaryFormat: { teamLine: '{setsWon} sets ({setScores})' },
  },
  compute: { winnerRule: { type: 'SETS', setsWonKey: 'setsWon', setScoresKey: 'setScores', bestOf: 3 } },
};

const wrestlingTemplate = baseSimplePoints('wrestling', [
  { key: 'period1A', label: 'P1 A', type: 'number', min: 0 },
  { key: 'period1B', label: 'P1 B', type: 'number', min: 0 },
  { key: 'period2A', label: 'P2 A', type: 'number', min: 0 },
  { key: 'period2B', label: 'P2 B', type: 'number', min: 0 },
  { key: 'fallA', label: 'Fall A', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
  { key: 'fallB', label: 'Fall B', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
]);

const athleticsTemplate: SportScorecardTemplate = {
  sportKey: 'athletics-100m',
  displayName: 'Athletics 100m International',
  sportType: 'INDIVIDUAL',
  scoringModel: 'TIME_DISTANCE',
  match: {
    teamFields: [
      { key: 'teamAValue', label: 'A Value', type: 'number', required: true, min: 0 },
      { key: 'teamBValue', label: 'B Value', type: 'number', required: true, min: 0 },
    ],
    sharedFields: [
      { key: 'reactionTimeA', label: 'RT A', type: 'number', min: 0 },
      { key: 'reactionTimeB', label: 'RT B', type: 'number', min: 0 },
      { key: 'laneA', label: 'Lane A', type: 'number', min: 1, max: 9 },
      { key: 'laneB', label: 'Lane B', type: 'number', min: 1, max: 9 },
    ],
    summaryFormat: { teamLine: '{value}' },
  },
  compute: { winnerRule: { type: 'TIME_DISTANCE', valueKey: 'value', lowerIsBetter: true } },
};

const swimmingTemplate: SportScorecardTemplate = {
  sportKey: 'swimming-50m',
  displayName: 'Swimming 50m International',
  sportType: 'INDIVIDUAL',
  scoringModel: 'TIME_DISTANCE',
  match: {
    teamFields: [
      { key: 'teamAValue', label: 'A Value', type: 'number', required: true, min: 0 },
      { key: 'teamBValue', label: 'B Value', type: 'number', required: true, min: 0 },
    ],
    sharedFields: [
      { key: 'split25mA', label: 'Split A', type: 'number', min: 0 },
      { key: 'split25mB', label: 'Split B', type: 'number', min: 0 },
      { key: 'strokeViolationA', label: 'Violation A', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'strokeViolationB', label: 'Violation B', type: 'select', options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'dqReasonA', label: 'DQ A', type: 'text' },
      { key: 'dqReasonB', label: 'DQ B', type: 'text' },
    ],
    summaryFormat: { teamLine: '{value}' },
  },
  compute: { winnerRule: { type: 'TIME_DISTANCE', valueKey: 'value', lowerIsBetter: true } },
};

test.describe('International score-engine invariants', () => {
  test('basketball: accepts valid quarter totals and rejects mismatched total', () => {
    expect(() =>
      validatePayload(basketballTemplate, {
        teamAScore: 87,
        teamBScore: 80,
        q1TeamA: 20,
        q2TeamA: 22,
        q3TeamA: 19,
        q4TeamA: 21,
        otTeamA: 5,
        q1TeamB: 18,
        q2TeamB: 20,
        q3TeamB: 21,
        q4TeamB: 21,
        otTeamB: 0,
      })
    ).not.toThrow();
    expect(() =>
      validatePayload(basketballTemplate, {
        teamAScore: 90,
        teamBScore: 80,
        q1TeamA: 20,
        q2TeamA: 22,
        q3TeamA: 19,
        q4TeamA: 21,
        otTeamA: 5,
        q1TeamB: 18,
        q2TeamB: 20,
        q3TeamB: 21,
        q4TeamB: 21,
        otTeamB: 0,
      })
    ).toThrow(/team a score must equal quarter\/ot total/i);
  });

  test('soccer: accepts valid half totals and rejects mismatch', () => {
    expect(() =>
      validatePayload(soccerTemplate, {
        teamAScore: 3,
        teamBScore: 2,
        half1TeamA: 1,
        half2TeamA: 2,
        half1TeamB: 1,
        half2TeamB: 1,
      })
    ).not.toThrow();
    expect(() =>
      validatePayload(soccerTemplate, {
        teamAScore: 4,
        teamBScore: 2,
        half1TeamA: 1,
        half2TeamA: 2,
        half1TeamB: 1,
        half2TeamB: 1,
      })
    ).toThrow(/team a score must equal half total/i);
  });

  test('baseball/softball: accepts valid innings total and rejects mismatch', () => {
    const validPayload = {
      teamAScore: 7,
      teamBScore: 5,
      inning1A: 1,
      inning2A: 0,
      inning3A: 2,
      inning4A: 0,
      inning5A: 3,
      inning6A: 1,
      inning7A: 0,
      inning1B: 0,
      inning2B: 1,
      inning3B: 1,
      inning4B: 0,
      inning5B: 2,
      inning6B: 1,
      inning7B: 0,
    };
    expect(() => validatePayload(baseballTemplate, validPayload)).not.toThrow();
    expect(() => validatePayload(baseballTemplate, { ...validPayload, teamBScore: 6 })).toThrow(
      /team b score must equal innings total/i
    );
  });

  test('tennis: accepts consistent setGames/setScores and rejects mismatch', () => {
    const validPayload = {
      set1GamesA: 6,
      set1GamesB: 4,
      set2GamesA: 3,
      set2GamesB: 6,
      set3GamesA: 7,
      set3GamesB: 6,
      setScores: [
        { teamAScore: 6, teamBScore: 4 },
        { teamAScore: 3, teamBScore: 6 },
        { teamAScore: 7, teamBScore: 6 },
      ],
    };
    expect(() => validatePayload(tennisTemplate, validPayload)).not.toThrow();
    expect(() =>
      validatePayload(tennisTemplate, {
        ...validPayload,
        setScores: [
          { teamAScore: 6, teamBScore: 4 },
          { teamAScore: 4, teamBScore: 6 },
          { teamAScore: 7, teamBScore: 6 },
        ],
      })
    ).toThrow(/tennis set 2 games must match setscores/i);
  });

  test('wrestling: accepts valid period totals and rejects dual-fall state', () => {
    expect(() =>
      validatePayload(wrestlingTemplate, {
        teamAScore: 7,
        teamBScore: 3,
        period1A: 3,
        period2A: 4,
        period1B: 1,
        period2B: 2,
        fallA: 'NO',
        fallB: 'NO',
      })
    ).not.toThrow();
    expect(() =>
      validatePayload(wrestlingTemplate, {
        teamAScore: 7,
        teamBScore: 3,
        period1A: 3,
        period2A: 4,
        period1B: 1,
        period2B: 2,
        fallA: 'YES',
        fallB: 'YES',
      })
    ).toThrow(/both wrestlers cannot win by fall/i);
  });

  test('athletics: accepts unique lanes and rejects duplicate lane assignment', () => {
    expect(() =>
      validatePayload(athleticsTemplate, {
        teamAValue: 11.23,
        teamBValue: 11.58,
        reactionTimeA: 0.154,
        reactionTimeB: 0.176,
        laneA: 3,
        laneB: 6,
      })
    ).not.toThrow();
    expect(() =>
      validatePayload(athleticsTemplate, {
        teamAValue: 11.23,
        teamBValue: 11.58,
        reactionTimeA: 0.154,
        reactionTimeB: 0.176,
        laneA: 4,
        laneB: 4,
      })
    ).toThrow(/lane assignments must be different/i);
    expect(() =>
      validatePayload(athleticsTemplate, {
        teamAValue: 11.23,
        teamBValue: 11.58,
        reactionTimeA: 1.004,
        reactionTimeB: 0.176,
        laneA: 3,
        laneB: 6,
      })
    ).toThrow(/reaction time a must be below 1 second/i);
  });

  test('swimming: accepts valid splits/DQ data and rejects missing DQ reason', () => {
    expect(() =>
      validatePayload(swimmingTemplate, {
        teamAValue: 26.41,
        teamBValue: 27.05,
        split25mA: 12.90,
        split25mB: 13.31,
        strokeViolationA: 'NO',
        strokeViolationB: 'NO',
        dqReasonA: '',
        dqReasonB: '',
      })
    ).not.toThrow();
    expect(() =>
      validatePayload(swimmingTemplate, {
        teamAValue: 26.41,
        teamBValue: 27.05,
        split25mA: 12.90,
        split25mB: 13.31,
        strokeViolationA: 'YES',
        strokeViolationB: 'NO',
        dqReasonA: '',
        dqReasonB: '',
      })
    ).toThrow(/dq reason is required for swimmer a/i);
    expect(() =>
      validatePayload(swimmingTemplate, {
        teamAValue: 26.41,
        teamBValue: 27.05,
        split25mA: 27.20,
        split25mB: 13.31,
        strokeViolationA: 'NO',
        strokeViolationB: 'NO',
        dqReasonA: '',
        dqReasonB: '',
      })
    ).toThrow(/split 25m a cannot exceed final time a/i);
  });
});


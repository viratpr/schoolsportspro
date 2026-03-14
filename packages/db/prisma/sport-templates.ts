/**
 * Scorecard template JSON per sport for seed. Matches SportScorecardTemplate type.
 */

export const footballTemplate = {
  sportKey: 'football',
  displayName: 'Football',
  sportType: 'TEAM' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Goals', type: 'number' as const, required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Goals', type: 'number' as const, required: true, min: 0 },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  players: {
    enabled: true,
    columns: [
      { key: 'goals', label: 'Goals', type: 'number' as const, min: 0 },
      { key: 'assists', label: 'Assists', type: 'number' as const, min: 0 },
      { key: 'yellowCards', label: 'Yellow Cards', type: 'number' as const, min: 0 },
      { key: 'redCards', label: 'Red Cards', type: 'number' as const, min: 0 },
    ],
  },
  compute: {
    winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' },
    marginRule: 'by N goals',
  },
};

export const basketballTemplate = {
  sportKey: 'basketball',
  displayName: 'Basketball',
  sportType: 'TEAM' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Points', type: 'number' as const, required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Points', type: 'number' as const, required: true, min: 0 },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  players: {
    enabled: true,
    columns: [
      { key: 'twoPt', label: '2PT', type: 'number' as const, min: 0 },
      { key: 'threePt', label: '3PT', type: 'number' as const, min: 0 },
      { key: 'freeThrows', label: 'FT', type: 'number' as const, min: 0 },
      { key: 'fouls', label: 'Fouls', type: 'number' as const, min: 0 },
    ],
  },
  compute: {
    winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' },
  },
};

export const kabaddiTemplate = {
  sportKey: 'kabaddi',
  displayName: 'Kabaddi',
  sportType: 'TEAM' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Points', type: 'number' as const, required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Points', type: 'number' as const, required: true, min: 0 },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  players: {
    enabled: true,
    columns: [
      { key: 'raidPoints', label: 'Raid Points', type: 'number' as const, min: 0 },
      { key: 'tacklePoints', label: 'Tackle Points', type: 'number' as const, min: 0 },
      { key: 'bonusPoints', label: 'Bonus Points', type: 'number' as const, min: 0 },
    ],
  },
  compute: {
    winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' },
  },
};

export const volleyballTemplate = {
  sportKey: 'volleyball',
  displayName: 'Volleyball',
  sportType: 'TEAM' as const,
  scoringModel: 'SETS' as const,
  match: {
    teamFields: [
      { key: 'setScores', label: 'Set scores', type: 'array' as const, arrayItem: { a: 'teamAScore', b: 'teamBScore' } },
    ],
    sharedFields: [
      { key: 'bestOfSets', label: 'Best of sets', type: 'number' as const, required: true, min: 1, max: 7 },
    ],
    constraints: {
      bestOfSets: 5,
      setPoints: 25,
      decidingSetPoints: 15,
      winBy: 2,
      maxPointsCap: 30,
      allowTieBreakOverride: false,
    },
    summaryFormat: { teamLine: '{setsWon} sets ({setScores})' },
  },
  players: {
    enabled: true,
    columns: [
      { key: 'aces', label: 'Aces', type: 'number' as const, min: 0 },
      { key: 'serviceErrors', label: 'Service errors', type: 'number' as const, min: 0 },
      { key: 'attackKills', label: 'Attack kills', type: 'number' as const, min: 0 },
      { key: 'attackErrors', label: 'Attack errors', type: 'number' as const, min: 0 },
      { key: 'blocks', label: 'Blocks', type: 'number' as const, min: 0 },
      { key: 'blockErrors', label: 'Block errors', type: 'number' as const, min: 0 },
      { key: 'digs', label: 'Digs', type: 'number' as const, min: 0 },
      { key: 'receptions', label: 'Receptions', type: 'number' as const, min: 0 },
      { key: 'receptionErrors', label: 'Reception errors', type: 'number' as const, min: 0 },
    ],
  },
  compute: {
    winnerRule: { type: 'SETS' as const, setsWonKey: 'setsWon', setScoresKey: 'setScores', bestOf: 5 },
  },
};

export const khoKhoTemplate = {
  sportKey: 'kho-kho',
  displayName: 'Kho-Kho',
  sportType: 'TEAM' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Points', type: 'number' as const, required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Points', type: 'number' as const, required: true, min: 0 },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  players: {
    enabled: true,
    columns: [{ key: 'points', label: 'Points', type: 'number' as const, min: 0 }],
  },
  compute: {
    winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' },
  },
};

export const cricketLiteTemplate = {
  sportKey: 'cricket',
  displayName: 'Cricket (Lite)',
  sportType: 'TEAM' as const,
  scoringModel: 'CRICKET_LITE' as const,
  match: {
    teamFields: [],
    sharedFields: [
      { key: 'oversLimit', label: 'Overs per innings', type: 'number' as const, required: true },
    ],
    summaryFormat: { teamLine: '{R}/{W} in {O}' },
  },
  players: { enabled: false, columns: [] },
  compute: {
    winnerRule: { type: 'CRICKET_LITE' as const },
  },
};

export const athleticsTimeTemplate = {
  sportKey: 'athletics-100m',
  displayName: 'Athletics 100m',
  sportType: 'INDIVIDUAL' as const,
  scoringModel: 'TIME_DISTANCE' as const,
  match: {
    teamFields: [
      { key: 'teamAValue', label: 'Time / Value A', type: 'number' as const },
      { key: 'teamBValue', label: 'Time / Value B', type: 'number' as const },
    ],
    summaryFormat: { teamLine: '{value}' },
  },
  compute: {
    winnerRule: { type: 'TIME_DISTANCE' as const, valueKey: 'value', lowerIsBetter: true },
  },
};

export const longJumpTemplate = {
  sportKey: 'long-jump',
  displayName: 'Long Jump',
  sportType: 'INDIVIDUAL' as const,
  scoringModel: 'ATTEMPTS_BEST_OF' as const,
  match: {
    teamFields: [
      { key: 'teamABest', label: 'Best (A)', type: 'number' as const },
      { key: 'teamBBest', label: 'Best (B)', type: 'number' as const },
    ],
    summaryFormat: { teamLine: '{best}' },
  },
  compute: {
    winnerRule: { type: 'ATTEMPTS_BEST_OF' as const, bestKey: 'best', higherIsBetter: true },
  },
};

export const sportTemplateByKey: Record<string, object> = {
  Football: footballTemplate,
  Basketball: basketballTemplate,
  Kabaddi: kabaddiTemplate,
  Volleyball: volleyballTemplate,
  'Kho-Kho': khoKhoTemplate,
  Cricket: cricketLiteTemplate,
  'Athletics 100m': athleticsTimeTemplate,
  'Long Jump': longJumpTemplate,
  'Shot Put': longJumpTemplate,
  Badminton: {
    sportKey: 'badminton',
    displayName: 'Badminton',
    sportType: 'INDIVIDUAL' as const,
    scoringModel: 'SETS' as const,
    match: {
      teamFields: [],
      summaryFormat: { teamLine: '{setsWon} sets ({setScores})' },
    },
    compute: { winnerRule: { type: 'SETS' as const, setsWonKey: 'setsWon', setScoresKey: 'setScores', bestOf: 3 } },
  },
  Chess: {
    sportKey: 'chess',
    displayName: 'Chess',
    sportType: 'INDIVIDUAL' as const,
    scoringModel: 'SIMPLE_POINTS' as const,
    match: {
      teamFields: [
        { key: 'teamAScore', label: 'Score A', type: 'number' as const },
        { key: 'teamBScore', label: 'Score B', type: 'number' as const },
      ],
      summaryFormat: { teamLine: '{score}' },
    },
    compute: { winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' } },
  },
};

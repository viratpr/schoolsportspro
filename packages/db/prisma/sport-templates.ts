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

export type SportTemplateVariants = {
  simple: object;
  international?: object;
};

const basketballInternationalTemplate = {
  ...basketballTemplate,
  displayName: 'Basketball (International)',
  match: {
    ...basketballTemplate.match,
    sharedFields: [
      { key: 'q1TeamA', label: 'Q1 Points (Team A)', type: 'number' as const, min: 0 },
      { key: 'q1TeamB', label: 'Q1 Points (Team B)', type: 'number' as const, min: 0 },
      { key: 'q2TeamA', label: 'Q2 Points (Team A)', type: 'number' as const, min: 0 },
      { key: 'q2TeamB', label: 'Q2 Points (Team B)', type: 'number' as const, min: 0 },
      { key: 'q3TeamA', label: 'Q3 Points (Team A)', type: 'number' as const, min: 0 },
      { key: 'q3TeamB', label: 'Q3 Points (Team B)', type: 'number' as const, min: 0 },
      { key: 'q4TeamA', label: 'Q4 Points (Team A)', type: 'number' as const, min: 0 },
      { key: 'q4TeamB', label: 'Q4 Points (Team B)', type: 'number' as const, min: 0 },
      { key: 'otTeamA', label: 'OT Points (Team A)', type: 'number' as const, min: 0 },
      { key: 'otTeamB', label: 'OT Points (Team B)', type: 'number' as const, min: 0 },
      { key: 'teamAFouls', label: 'Team A Fouls', type: 'number' as const, min: 0 },
      { key: 'teamBFouls', label: 'Team B Fouls', type: 'number' as const, min: 0 },
    ],
  },
};

const soccerInternationalTemplate = {
  ...footballTemplate,
  displayName: 'Soccer (International)',
  match: {
    ...footballTemplate.match,
    sharedFields: [
      { key: 'half1TeamA', label: '1st Half Goals (Team A)', type: 'number' as const, min: 0 },
      { key: 'half1TeamB', label: '1st Half Goals (Team B)', type: 'number' as const, min: 0 },
      { key: 'half2TeamA', label: '2nd Half Goals (Team A)', type: 'number' as const, min: 0 },
      { key: 'half2TeamB', label: '2nd Half Goals (Team B)', type: 'number' as const, min: 0 },
      { key: 'shotsOnTargetA', label: 'Shots on Target (Team A)', type: 'number' as const, min: 0 },
      { key: 'shotsOnTargetB', label: 'Shots on Target (Team B)', type: 'number' as const, min: 0 },
      { key: 'yellowCardsA', label: 'Yellow Cards (Team A)', type: 'number' as const, min: 0 },
      { key: 'yellowCardsB', label: 'Yellow Cards (Team B)', type: 'number' as const, min: 0 },
      { key: 'redCardsA', label: 'Red Cards (Team A)', type: 'number' as const, min: 0 },
      { key: 'redCardsB', label: 'Red Cards (Team B)', type: 'number' as const, min: 0 },
      { key: 'penaltyGoalsA', label: 'Penalty Shootout Goals (Team A)', type: 'number' as const, min: 0 },
      { key: 'penaltyGoalsB', label: 'Penalty Shootout Goals (Team B)', type: 'number' as const, min: 0 },
    ],
  },
};

const volleyballInternationalTemplate = {
  ...volleyballTemplate,
  displayName: 'Volleyball (International)',
  players: {
    enabled: true,
    columns: [
      ...volleyballTemplate.players.columns,
      { key: 'serveAttempts', label: 'Serve Attempts', type: 'number' as const, min: 0 },
      { key: 'attackAttempts', label: 'Attack Attempts', type: 'number' as const, min: 0 },
      { key: 'receivedServes', label: 'Received Serves', type: 'number' as const, min: 0 },
    ],
  },
};

const baseballSoftballInternationalTemplate = {
  sportKey: 'baseball-softball',
  displayName: 'Baseball/Softball (International)',
  sportType: 'TEAM' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Team A Runs', type: 'number' as const, required: true, min: 0 },
      { key: 'teamBScore', label: 'Team B Runs', type: 'number' as const, required: true, min: 0 },
    ],
    sharedFields: [
      { key: 'inning1A', label: 'Inning 1 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning1B', label: 'Inning 1 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning2A', label: 'Inning 2 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning2B', label: 'Inning 2 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning3A', label: 'Inning 3 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning3B', label: 'Inning 3 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning4A', label: 'Inning 4 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning4B', label: 'Inning 4 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning5A', label: 'Inning 5 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning5B', label: 'Inning 5 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning6A', label: 'Inning 6 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning6B', label: 'Inning 6 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning7A', label: 'Inning 7 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning7B', label: 'Inning 7 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning8A', label: 'Inning 8 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning8B', label: 'Inning 8 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning9A', label: 'Inning 9 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning9B', label: 'Inning 9 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning10A', label: 'Inning 10 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning10B', label: 'Inning 10 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning11A', label: 'Inning 11 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning11B', label: 'Inning 11 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'inning12A', label: 'Inning 12 Runs (A)', type: 'number' as const, min: 0 },
      { key: 'inning12B', label: 'Inning 12 Runs (B)', type: 'number' as const, min: 0 },
      { key: 'hitsA', label: 'H (Team A)', type: 'number' as const, min: 0 },
      { key: 'hitsB', label: 'H (Team B)', type: 'number' as const, min: 0 },
      { key: 'errorsA', label: 'E (Team A)', type: 'number' as const, min: 0 },
      { key: 'errorsB', label: 'E (Team B)', type: 'number' as const, min: 0 },
      { key: 'leftOnBaseA', label: 'LOB (Team A)', type: 'number' as const, min: 0 },
      { key: 'leftOnBaseB', label: 'LOB (Team B)', type: 'number' as const, min: 0 },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  players: {
    enabled: true,
    columns: [
      { key: 'battingOrder', label: '#', type: 'number' as const, min: 1, max: 99 },
      { key: 'position', label: 'Pos', type: 'text' as const },
      { key: 'inningsPlayed', label: 'Inn', type: 'text' as const },
      { key: 'singles', label: '1B', type: 'number' as const, min: 0 },
      { key: 'doubles', label: '2B', type: 'number' as const, min: 0 },
      { key: 'triples', label: '3B', type: 'number' as const, min: 0 },
      { key: 'homeRuns', label: 'HR', type: 'number' as const, min: 0 },
      { key: 'runsBattedIn', label: 'RBI', type: 'number' as const, min: 0 },
      { key: 'runs', label: 'R', type: 'number' as const, min: 0 },
      { key: 'walks', label: 'BB', type: 'number' as const, min: 0 },
      { key: 'strikeOuts', label: 'SO', type: 'number' as const, min: 0 },
      { key: 'hitByPitch', label: 'HBP', type: 'number' as const, min: 0 },
      { key: 'sacrificeFly', label: 'SF', type: 'number' as const, min: 0 },
      { key: 'sacrificeHit', label: 'SH', type: 'number' as const, min: 0 },
    ],
  },
  compute: { winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' } },
  ui: {
    hints: [
      'International baseball scorebook style: inning-wise runs (1-12), team totals (R/H/E/LOB), and detailed batter line stats.',
    ],
  },
};

const tennisSimpleTemplate = {
  sportKey: 'tennis',
  displayName: 'Tennis',
  sportType: 'INDIVIDUAL' as const,
  scoringModel: 'SETS' as const,
  match: {
    teamFields: [],
    summaryFormat: { teamLine: '{setsWon} sets ({setScores})' },
  },
  compute: { winnerRule: { type: 'SETS' as const, setsWonKey: 'setsWon', setScoresKey: 'setScores', bestOf: 3 } },
};

const tennisInternationalTemplate = {
  ...tennisSimpleTemplate,
  displayName: 'Tennis (International)',
  match: {
    ...tennisSimpleTemplate.match,
    sharedFields: [
      { key: 'set1GamesA', label: 'Set 1 Games (A)', type: 'number' as const, min: 0 },
      { key: 'set1GamesB', label: 'Set 1 Games (B)', type: 'number' as const, min: 0 },
      { key: 'set2GamesA', label: 'Set 2 Games (A)', type: 'number' as const, min: 0 },
      { key: 'set2GamesB', label: 'Set 2 Games (B)', type: 'number' as const, min: 0 },
      { key: 'set3GamesA', label: 'Set 3 Games (A)', type: 'number' as const, min: 0 },
      { key: 'set3GamesB', label: 'Set 3 Games (B)', type: 'number' as const, min: 0 },
      { key: 'tieBreakPointsA', label: 'Tie-break Points (A)', type: 'number' as const, min: 0 },
      { key: 'tieBreakPointsB', label: 'Tie-break Points (B)', type: 'number' as const, min: 0 },
    ],
  },
};

const wrestlingSimpleTemplate = {
  sportKey: 'wrestling',
  displayName: 'Wrestling',
  sportType: 'INDIVIDUAL' as const,
  scoringModel: 'SIMPLE_POINTS' as const,
  match: {
    teamFields: [
      { key: 'teamAScore', label: 'Competitor A Points', type: 'number' as const },
      { key: 'teamBScore', label: 'Competitor B Points', type: 'number' as const },
    ],
    summaryFormat: { teamLine: '{score}' },
  },
  compute: { winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' } },
};

const wrestlingInternationalTemplate = {
  ...wrestlingSimpleTemplate,
  displayName: 'Wrestling (International)',
  match: {
    ...wrestlingSimpleTemplate.match,
    sharedFields: [
      { key: 'period1A', label: 'Period 1 Points (A)', type: 'number' as const, min: 0 },
      { key: 'period1B', label: 'Period 1 Points (B)', type: 'number' as const, min: 0 },
      { key: 'period2A', label: 'Period 2 Points (A)', type: 'number' as const, min: 0 },
      { key: 'period2B', label: 'Period 2 Points (B)', type: 'number' as const, min: 0 },
      { key: 'takedownsA', label: 'Takedowns (A)', type: 'number' as const, min: 0 },
      { key: 'takedownsB', label: 'Takedowns (B)', type: 'number' as const, min: 0 },
      { key: 'escapesA', label: 'Escapes (A)', type: 'number' as const, min: 0 },
      { key: 'escapesB', label: 'Escapes (B)', type: 'number' as const, min: 0 },
      { key: 'reversalsA', label: 'Reversals (A)', type: 'number' as const, min: 0 },
      { key: 'reversalsB', label: 'Reversals (B)', type: 'number' as const, min: 0 },
      { key: 'fallA', label: 'Fall / Pin by A', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'fallB', label: 'Fall / Pin by B', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
    ],
  },
};

const athletics100mInternationalTemplate = {
  ...athleticsTimeTemplate,
  displayName: 'Athletics 100m (International)',
  match: {
    ...athleticsTimeTemplate.match,
    sharedFields: [
      { key: 'reactionTimeA', label: 'Reaction Time A (s)', type: 'number' as const, min: 0, step: 0.001 },
      { key: 'reactionTimeB', label: 'Reaction Time B (s)', type: 'number' as const, min: 0, step: 0.001 },
      { key: 'windMps', label: 'Wind Reading (m/s)', type: 'number' as const, step: 0.1 },
      { key: 'heatNo', label: 'Heat Number', type: 'number' as const, min: 1 },
      { key: 'laneA', label: 'Lane A', type: 'number' as const, min: 1, max: 9 },
      { key: 'laneB', label: 'Lane B', type: 'number' as const, min: 1, max: 9 },
      { key: 'dqA', label: 'Disqualified A', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'dqB', label: 'Disqualified B', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
    ],
  },
};

const swimming50mInternationalTemplate = {
  ...athleticsTimeTemplate,
  sportKey: 'swimming-50m',
  displayName: 'Swimming 50m Freestyle (International)',
  match: {
    ...athleticsTimeTemplate.match,
    sharedFields: [
      { key: 'split25mA', label: '25m Split A (s)', type: 'number' as const, min: 0, step: 0.01 },
      { key: 'split25mB', label: '25m Split B (s)', type: 'number' as const, min: 0, step: 0.01 },
      { key: 'strokeViolationA', label: 'Stroke Violation A', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'strokeViolationB', label: 'Stroke Violation B', type: 'select' as const, options: [{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }] },
      { key: 'dqReasonA', label: 'DQ Reason A', type: 'text' as const },
      { key: 'dqReasonB', label: 'DQ Reason B', type: 'text' as const },
    ],
  },
};

export const sportTemplateByKey: Record<string, SportTemplateVariants> = {
  Football: { simple: footballTemplate },
  Soccer: { simple: footballTemplate, international: soccerInternationalTemplate },
  Basketball: { simple: basketballTemplate, international: basketballInternationalTemplate },
  'Baseball/Softball': {
    simple: {
      sportKey: 'baseball-softball',
      displayName: 'Baseball/Softball',
      sportType: 'TEAM' as const,
      scoringModel: 'SIMPLE_POINTS' as const,
      match: {
        teamFields: [
          { key: 'teamAScore', label: 'Team A Runs', type: 'number' as const, required: true, min: 0 },
          { key: 'teamBScore', label: 'Team B Runs', type: 'number' as const, required: true, min: 0 },
        ],
        summaryFormat: { teamLine: '{score}' },
      },
      players: { enabled: true, columns: [{ key: 'hits', label: 'Hits', type: 'number' as const, min: 0 }] },
      compute: { winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' } },
    },
    international: baseballSoftballInternationalTemplate,
  },
  'American Football': {
    simple: {
      sportKey: 'american-football',
      displayName: 'American Football',
      sportType: 'TEAM' as const,
      scoringModel: 'SIMPLE_POINTS' as const,
      match: {
        teamFields: [
          { key: 'teamAScore', label: 'Team A Points', type: 'number' as const, required: true, min: 0 },
          { key: 'teamBScore', label: 'Team B Points', type: 'number' as const, required: true, min: 0 },
        ],
        summaryFormat: { teamLine: '{score}' },
      },
      players: { enabled: true, columns: [{ key: 'touchdowns', label: 'Touchdowns', type: 'number' as const, min: 0 }] },
      compute: { winnerRule: { type: 'SIMPLE_POINTS' as const, teamScoreKey: 'score' } },
    },
  },
  Kabaddi: { simple: kabaddiTemplate },
  Volleyball: { simple: volleyballTemplate, international: volleyballInternationalTemplate },
  'Kho-Kho': { simple: khoKhoTemplate },
  Cricket: { simple: cricketLiteTemplate },
  'Athletics 100m': { simple: athleticsTimeTemplate, international: athletics100mInternationalTemplate },
  'Track & Field 100m': { simple: athleticsTimeTemplate, international: athletics100mInternationalTemplate },
  'Swimming 50m Freestyle': { simple: athleticsTimeTemplate, international: swimming50mInternationalTemplate },
  'Long Jump': { simple: longJumpTemplate },
  'Shot Put': { simple: longJumpTemplate },
  Badminton: {
    simple: {
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
  },
  Tennis: { simple: tennisSimpleTemplate, international: tennisInternationalTemplate },
  Wrestling: { simple: wrestlingSimpleTemplate, international: wrestlingInternationalTemplate },
  Chess: {
    simple: {
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
  },
};

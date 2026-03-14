/**
 * Scorecard template types — drive dynamic forms and scoring engine.
 * Align with JSON stored in Sport.scorecardTemplateJson and CompetitionSport.templateSnapshotJson.
 */

export type ScoringModel =
  | 'SIMPLE_POINTS'
  | 'SETS'
  | 'CRICKET_LITE'
  | 'TIME_DISTANCE'
  | 'ATTEMPTS_BEST_OF';

export type SportType = 'TEAM' | 'INDIVIDUAL';

export type FieldType = 'number' | 'text' | 'select' | 'array';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  arrayItem?: { a: string; b: string }; // e.g. set scores: { a: 'teamAScore', b: 'teamBScore' }
}

export interface PlayerColumnDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export interface TotalRuleDef {
  columnKey: string;
  aggregate: 'sum' | 'max' | 'min';
  targetKey?: string; // optional key in payload for stored total
}

export interface SummaryFormat {
  teamLine: string; // e.g. "{score}" or "{setsWon} sets ({setScores})"
}

export type WinnerRuleDef =
  | { type: 'SIMPLE_POINTS'; teamScoreKey: string }
  | { type: 'SETS'; setsWonKey: string; setScoresKey?: string; bestOf?: number }
  | { type: 'CRICKET_LITE'; inningsKey?: string }
  | { type: 'TIME_DISTANCE'; valueKey: string; lowerIsBetter: boolean }
  | { type: 'ATTEMPTS_BEST_OF'; bestKey: string; attemptsKey?: string; higherIsBetter: boolean };

export interface SportScorecardTemplate {
  sportKey: string;
  displayName: string;
  sportType: SportType;
  scoringModel: ScoringModel;
  match: {
    teamFields: FieldDef[];
    sharedFields?: FieldDef[];
    /**
     * Optional sport-specific constraints for SETS / TIME_DISTANCE models.
     * For volleyball (sportKey = "volleyball", scoringModel = "SETS"):
     * - bestOfSets: 3 or 5
     * - setPoints / regularSetPoints: target for sets 1..N-1 (e.g. 25)
     * - decidingSetPoints: target for final set (e.g. 15)
     * - winBy: points difference to win (typically 2)
     * - maxPointsCap: optional hard cap (e.g. 30)
     * - allowTieBreakOverride: allow admin override in unusual cases
     */
    constraints?: {
      bestOfSets?: number;
      setPoints?: number;
      regularSetPoints?: number;
      decidingSetPoints?: number;
      winBy?: number;
      maxPointsCap?: number;
      allowTieBreakOverride?: boolean;
      // Other sport-specific keys are allowed and ignored by the engine.
      [key: string]: unknown;
    };
    summaryFormat: SummaryFormat;
  };
  players?: {
    enabled: boolean;
    columns: PlayerColumnDef[];
    totals?: TotalRuleDef[];
  };
  compute: {
    winnerRule: WinnerRuleDef;
    marginRule?: string;
  };
  ui?: {
    hints?: string[];
    icons?: string[];
  };
}

/**
 * Generic payload for template-driven scorecards.
 *
 * For volleyball (sportKey = "volleyball", scoringModel = "SETS") the engine expects:
 * - payloadJson.setScores: Array<VolleyballSetScore>
 * - Optional payloadJson.rallies: Array<VolleyballRally>
 *   (currently used for future analytics; core scoring uses setScores)
 */
export type TemplatePayload = Record<string, unknown>;

/** One volleyball set score in rally scoring (indoor 6v6). */
export interface VolleyballSetScore {
  /** Points scored by Team A in this set. */
  teamAScore: number;
  /** Points scored by Team B in this set. */
  teamBScore: number;
}

/** Optional per-rally record for advanced volleyball stats. */
export interface VolleyballRally {
  /** 1-based set number this rally belongs to. */
  setNumber: number;
  /** 1-based rally index within the set. */
  rallyNumber: number;
  /** Team ID that served this rally. */
  serverTeamId: string;
  /** Team ID that won the rally (and scores the point). */
  scorerTeamId: string;
  /** Optional categorical outcome (e.g. "ACE", "ATTACK_KILL", "ERROR", etc.). */
  result?: string;
  /** Optional rotation or position string for later analytics. */
  rotation?: string;
  /** Optional error type when the rally ends in an error. */
  errorType?: string;
}

/**
 * Recommended shape of payloadJson for volleyball template scorecards.
 *
 * This is the public API contract for:
 * - PUT /tenants/:tenantId/matches/:matchId/template-scorecard
 * - POST /tenants/:tenantId/matches/:matchId/template-scorecard/finalize
 * when the underlying template is volleyball (sportKey = "volleyball", scoringModel = "SETS").
 */
export interface VolleyballTemplatePayload {
  /**
   * Ordered list of set scores for the match.
   * The scoring engine enforces:
   * - best-of-N from template.match.constraints.bestOfSets
   * - target points and win-by rules per set
   * - optional maxPointsCap
   */
  setScores: VolleyballSetScore[];
  /**
   * Optional detailed per-rally log. Saved in payloadJson as-is
   * and available for future analytics; not required to compute
   * winners or summaries.
   */
  rallies?: VolleyballRally[];
  /**
   * Additional keys are allowed for future extensions and are
   * ignored by the volleyball scoring engine.
   */
  [key: string]: unknown;
}

export interface PlayerStatLineInput {
  teamId: string;
  studentId?: string | null;
  playerName?: string | null;
  stats: Record<string, unknown>;
}

/**
 * Recommended volleyball player stat schema stored in PlayerStatLine.statsJson
 * when using the volleyball template scorecard.
 *
 * This matches the public API contract for volleyball template-scorecard
 * playerLines[].stats in PUT/POST requests.
 */
export interface VolleyballPlayerStats {
  aces?: number;
  serviceErrors?: number;
  attackKills?: number;
  attackErrors?: number;
  blocks?: number;
  blockErrors?: number;
  digs?: number;
  receptions?: number;
  receptionErrors?: number;
  // Additional stats can be added without breaking the contract.
  [key: string]: unknown;
}

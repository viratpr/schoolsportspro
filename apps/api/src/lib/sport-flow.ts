/**
 * Sport flow description and matchConfigJson documentation.
 *
 * matchConfigJson shapes per scoringModel (for super-admin and UI):
 *
 * - SIMPLE_POINTS: { halves?: number; halfMinutes?: number; quarters?: number; quarterMinutes?: number; tieBreaker?: string }
 * - SETS: { bestOfSets?: number; setPoints?: number; decidingSetPoints?: number; winBy?: number; bestOfGames?: number; gamePoints?: number; maxPointCap?: number }
 * - CRICKET_LITE: { oversPerInnings?: number; innings?: number; ballPerOver?: number }
 * - TIME_DISTANCE: { type: 'TIME' | 'DISTANCE'; unit?: string; attempts?: number }
 *
 * Round behaviour: KNOCKOUT = single elimination bracket; INDIVIDUAL = participant list + results/leaderboard.
 */

export type SportType = 'TEAM' | 'INDIVIDUAL';
export type MatchFormat = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';

export function getSportFlowDescription(sportType: SportType, matchFormat?: MatchFormat | null): string {
  if (sportType === 'TEAM') {
    return 'Create category (KNOCKOUT) → Create teams → Add members → Generate bracket → Play matches (enter scores, finalize) → Winner advances to next round.';
  }
  if (matchFormat === 'DOUBLES' || matchFormat === 'MIXED_DOUBLES') {
    return 'Create category (from template with Doubles/Mixed) → Add pairs (coming soon) → Bracket or leaderboard.';
  }
  return 'Create category (INDIVIDUAL) → Add participants → Enter results / leaderboard (or run knockout draw).';
}

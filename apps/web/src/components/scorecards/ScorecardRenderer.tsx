'use client';

import { SetsForm } from './SetsForm';
import { SimplePointsForm } from './SimplePointsForm';
import { TimeDistanceForm } from './TimeDistanceForm';

type Props = {
  scoringModel: 'SIMPLE_POINTS' | 'SETS' | 'TIME_DISTANCE' | 'CRICKET_LITE';
  matchConfigJson?: Record<string, unknown> | null;
  teamAName: string;
  teamBName: string;
  scorecardJson: Record<string, unknown>;
  onChange: (nextJson: Record<string, unknown>, derived?: { summaryA?: string; summaryB?: string; numericScoreA?: number; numericScoreB?: number }) => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** Parse SETS matchConfigJson (aligns with API services/scorecard.ts). */
export type SetsConfig = {
  bestOfSets: number;
  setPoints: number;
  decidingSetPoints: number;
  winBy: number;
  maxPointsCap?: number;
  allowTieBreakOverride?: boolean;
};
function parseSetsConfig(matchConfigJson: unknown): SetsConfig {
  const c = asRecord(matchConfigJson);
  return {
    bestOfSets: Number(c.bestOfSets ?? 3),
    setPoints: Number(c.setPoints ?? (c as { regularSetPoints?: unknown }).regularSetPoints ?? 21),
    decidingSetPoints: Number(c.decidingSetPoints ?? 15),
    winBy: Number(c.winBy ?? 2),
    maxPointsCap: c.maxPointsCap != null ? Number(c.maxPointsCap) : undefined,
    allowTieBreakOverride: c.allowTieBreakOverride != null ? Boolean(c.allowTieBreakOverride) : undefined,
  };
}

/** Parse TIME_DISTANCE matchConfigJson (aligns with API). */
export type TimeDistanceConfig = {
  type: 'TIME' | 'DISTANCE';
  unit?: string;
  attempts: number;
};
function parseTimeDistanceConfig(matchConfigJson: unknown): TimeDistanceConfig {
  const c = asRecord(matchConfigJson);
  const rawType = String(c.type ?? 'DISTANCE').toUpperCase();
  return {
    type: rawType === 'TIME' ? 'TIME' : 'DISTANCE',
    unit: typeof c.unit === 'string' ? c.unit : undefined,
    attempts: Number(c.attempts ?? 1),
  };
}

export function ScorecardRenderer({ scoringModel, matchConfigJson, teamAName, teamBName, scorecardJson, onChange }: Props) {
  if (scoringModel === 'SETS') {
    const setsConfig = parseSetsConfig(matchConfigJson ?? {});
    const setsBlock = asRecord(scorecardJson.sets);
    const currentSets = Array.isArray(setsBlock.sets)
      ? (setsBlock.sets as Array<{ teamAScore?: number; teamBScore?: number }>).map((s) => ({
          teamAScore: Number(s.teamAScore ?? 0),
          teamBScore: Number(s.teamBScore ?? 0),
        }))
      : [{ teamAScore: 0, teamBScore: 0 }];
    return (
      <SetsForm
        teamAName={teamAName}
        teamBName={teamBName}
        sets={currentSets}
        config={setsConfig}
        onChange={(nextSets) => {
          let wonA = 0;
          let wonB = 0;
          for (const s of nextSets) {
            if (s.teamAScore > s.teamBScore) wonA += 1;
            if (s.teamBScore > s.teamAScore) wonB += 1;
          }
          onChange(
            {
              ...scorecardJson,
              sets: { sets: nextSets },
            },
            {
              summaryA: `Sets won: ${wonA}`,
              summaryB: `Sets won: ${wonB}`,
              numericScoreA: wonA,
              numericScoreB: wonB,
            }
          );
        }}
      />
    );
  }

  if (scoringModel === 'TIME_DISTANCE') {
    const tdConfig = parseTimeDistanceConfig(matchConfigJson ?? {});
    const tdBlock = asRecord(scorecardJson.timeDistance);
    const unit = typeof tdBlock.unit === 'string'
      ? tdBlock.unit
      : (tdConfig.unit ?? (typeof matchConfigJson?.unit === 'string' ? matchConfigJson.unit : undefined));
    const teamAValue = Number(tdBlock.teamAValue ?? 0);
    const teamBValue = Number(tdBlock.teamBValue ?? 0);
    return (
      <TimeDistanceForm
        teamAName={teamAName}
        teamBName={teamBName}
        config={tdConfig}
        unit={unit}
        teamAValue={teamAValue}
        teamBValue={teamBValue}
        onChange={(next) =>
          onChange(
            {
              ...scorecardJson,
              timeDistance: {
                ...tdBlock,
                ...next,
              },
            },
            {
              summaryA: `${next.teamAValue}${unit ? ` ${unit}` : ''}`,
              summaryB: `${next.teamBValue}${unit ? ` ${unit}` : ''}`,
              numericScoreA: next.teamAValue,
              numericScoreB: next.teamBValue,
            }
          )
        }
      />
    );
  }

  if (scoringModel === 'CRICKET_LITE') {
    return <p className="text-sm text-muted-foreground">Use the dedicated Cricket scorecard pages for cricket matches.</p>;
  }

  const simpleBlock = asRecord(scorecardJson.simplePoints);
  const teamAScore = Number(simpleBlock.teamAScore ?? 0);
  const teamBScore = Number(simpleBlock.teamBScore ?? 0);
  return (
    <SimplePointsForm
      teamAName={teamAName}
      teamBName={teamBName}
      teamAScore={teamAScore}
      teamBScore={teamBScore}
      onChange={(next) =>
        onChange(
          {
            ...scorecardJson,
            simplePoints: next,
          },
          {
            summaryA: String(next.teamAScore),
            summaryB: String(next.teamBScore),
            numericScoreA: next.teamAScore,
            numericScoreB: next.teamBScore,
          }
        )
      }
    />
  );
}


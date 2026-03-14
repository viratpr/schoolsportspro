'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SetsConfig } from './ScorecardRenderer';

type SetRow = { teamAScore: number; teamBScore: number };

type Props = {
  teamAName: string;
  teamBName: string;
  sets: SetRow[];
  /** From sport matchConfigJson; drives max sets and point hints. */
  config?: SetsConfig | null;
  onChange: (next: SetRow[]) => void;
};

export function SetsForm({ teamAName, teamBName, sets, config, onChange }: Props) {
  const bestOfSets = config?.bestOfSets ?? 5;
  const setPoints = config?.setPoints ?? 21;
  const decidingSetPoints = config?.decidingSetPoints ?? 15;
  const winBy = config?.winBy ?? 2;
  const maxSets = Math.max(1, bestOfSets);
  const canAddSet = sets.length < maxSets;
  const displaySets = sets.length > 0 ? sets : [{ teamAScore: 0, teamBScore: 0 }];

  const getSetHint = (idx: number) => {
    const isDeciding = maxSets > 1 && idx === displaySets.length - 1 && displaySets.length === maxSets;
    const pointsToWin = isDeciding ? decidingSetPoints : setPoints;
    return `First to ${pointsToWin} points, win by ${winBy}`;
  };

  return (
    <div className="space-y-3">
      {maxSets > 1 && (
        <p className="text-sm text-muted-foreground">
          Best of {maxSets} sets · Regular set: first to {setPoints} (win by {winBy}) · Deciding set: first to {decidingSetPoints} (win by {winBy})
        </p>
      )}
      {displaySets.map((s, idx) => {
        const isDeciding = maxSets > 1 && idx === displaySets.length - 1 && displaySets.length === maxSets;
        const setLabel = `Set ${idx + 1}${isDeciding ? ' (deciding)' : ''}`;
        const hint = getSetHint(idx);
        return (
          <div key={`set-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label title={hint}>{teamAName} — {setLabel}</Label>
              <p className="text-xs text-muted-foreground mb-1">{hint}</p>
              <Input
                type="number"
                min={0}
                value={s.teamAScore}
                onChange={(e) => {
                  const next = [...displaySets];
                  next[idx] = { ...next[idx], teamAScore: Number(e.target.value || 0) };
                  onChange(next);
                }}
              />
            </div>
            <div>
              <Label title={hint}>{teamBName} — {setLabel}</Label>
              <p className="text-xs text-muted-foreground mb-1">{hint}</p>
              <Input
                type="number"
                min={0}
                value={s.teamBScore}
                onChange={(e) => {
                  const next = [...displaySets];
                  next[idx] = { ...next[idx], teamBScore: Number(e.target.value || 0) };
                  onChange(next);
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(displaySets.filter((_, i) => i !== idx))}
              disabled={displaySets.length <= 1}
            >
              Remove
            </Button>
          </div>
        );
      })}
      {canAddSet && (
        <Button type="button" variant="outline" onClick={() => onChange([...displaySets, { teamAScore: 0, teamBScore: 0 }])}>
          Add set
        </Button>
      )}
    </div>
  );
}


'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TimeDistanceConfig } from './ScorecardRenderer';

type Props = {
  teamAName: string;
  teamBName: string;
  /** From sport matchConfigJson; type (TIME/DISTANCE) and unit used for labels. */
  config?: TimeDistanceConfig | null;
  unit?: string;
  teamAValue: number;
  teamBValue: number;
  onChange: (next: { teamAValue: number; teamBValue: number }) => void;
};

export function TimeDistanceForm({ teamAName, teamBName, config, unit, teamAValue, teamBValue, onChange }: Props) {
  const effectiveUnit = unit ?? config?.unit;
  const typeLabel = config?.type === 'TIME' ? 'Time' : config?.type === 'DISTANCE' ? 'Distance' : null;
  const suffix = effectiveUnit ? ` (${effectiveUnit})` : (typeLabel ? ` (${typeLabel})` : '');
  const hint = config && config.attempts > 1 ? `Best of ${config.attempts} attempts` : undefined;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {typeLabel && (
        <p className="col-span-full text-sm text-muted-foreground">
          {typeLabel} scoring{effectiveUnit ? ` in ${effectiveUnit}` : ''}{config && config.attempts > 1 ? ` · Best of ${config.attempts} attempts` : ''}
        </p>
      )}
      <div>
        <Label title={hint}>{teamAName}{suffix}</Label>
        <Input
          type="number"
          min={0}
          step={config?.type === 'TIME' ? 0.01 : 1}
          value={teamAValue}
          onChange={(e) => onChange({ teamAValue: Number(e.target.value || 0), teamBValue })}
        />
      </div>
      <div>
        <Label title={hint}>{teamBName}{suffix}</Label>
        <Input
          type="number"
          min={0}
          step={config?.type === 'TIME' ? 0.01 : 1}
          value={teamBValue}
          onChange={(e) => onChange({ teamAValue, teamBValue: Number(e.target.value || 0) })}
        />
      </div>
    </div>
  );
}


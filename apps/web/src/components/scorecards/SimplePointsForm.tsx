'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  onChange: (next: { teamAScore: number; teamBScore: number }) => void;
};

export function SimplePointsForm({ teamAName, teamBName, teamAScore, teamBScore, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>{teamAName} score</Label>
        <Input
          type="number"
          value={teamAScore}
          onChange={(e) => onChange({ teamAScore: Number(e.target.value || 0), teamBScore })}
        />
      </div>
      <div>
        <Label>{teamBName} score</Label>
        <Input
          type="number"
          value={teamBScore}
          onChange={(e) => onChange({ teamAScore, teamBScore: Number(e.target.value || 0) })}
        />
      </div>
    </div>
  );
}


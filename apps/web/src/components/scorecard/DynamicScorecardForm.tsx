'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FieldDef = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  arrayItem?: { a: string; b: string };
};

type PlayerColumnDef = { key: string; label: string; type: string; min?: number; max?: number };

type Template = {
  sportKey: string;
  displayName: string;
  sportType: string;
  scoringModel: string;
  match: {
    teamFields: FieldDef[];
    sharedFields?: FieldDef[];
    constraints?: {
      bestOfSets?: number;
      setPoints?: number;
      regularSetPoints?: number;
      decidingSetPoints?: number;
      winBy?: number;
      maxPointsCap?: number;
      allowTieBreakOverride?: boolean;
      [key: string]: unknown;
    };
    summaryFormat: { teamLine: string };
  };
  players?: {
    enabled: boolean;
    columns: PlayerColumnDef[];
  };
  ui?: { hints?: string[] };
};

type RosterMember = { studentId: string; fullName: string; admissionNo: string };

type Props = {
  template: Template;
  templateVersion: number;
  match: { id: string; teamAId: string | null; teamBId: string | null; teamAName: string | null; teamBName: string | null; status: string };
  matchScorecard: {
    id: string;
    status: string;
    payloadJson: Record<string, unknown>;
    computedJson: Record<string, unknown> | null;
    summaryA: string;
    summaryB: string;
    winnerTeamId: string | null;
  } | null;
  roster: { teamA: RosterMember[]; teamB: RosterMember[] };
  tenantId: string;
  matchId: string;
  onSaveDraft: (body: { payloadJson: Record<string, unknown>; playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[] }) => Promise<unknown>;
  onFinalize: (body: { payloadJson: Record<string, unknown>; playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[] }) => Promise<unknown>;
  canFinalize: boolean;
};

export function DynamicScorecardForm({
  template,
  match,
  matchScorecard,
  roster,
  tenantId,
  matchId,
  onSaveDraft,
  onFinalize,
  canFinalize,
}: Props) {
  const initialPayload = (matchScorecard?.payloadJson ?? {}) as Record<string, unknown>;
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload);
  const [playerStats, setPlayerStats] = useState<Record<string, Record<string, unknown>>>(() => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const m of roster.teamA) out[`A-${m.studentId}`] = {};
    for (const m of roster.teamB) out[`B-${m.studentId}`] = {};
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [computedPreview, setComputedPreview] = useState<Record<string, unknown> | null>(matchScorecard?.computedJson ?? null);
  const isVolleyballSets =
    template.sportKey === 'volleyball' && template.scoringModel === 'SETS';
  const volleyballConstraints = template.match.constraints ?? {};

  const buildPlayerLines = useCallback(() => {
    const lines: { teamId: string; studentId: string | null; playerName: string | null; stats: Record<string, unknown> }[] = [];
    const teamAId = match.teamAId ?? '';
    const teamBId = match.teamBId ?? '';
    for (const m of roster.teamA) {
      const key = `A-${m.studentId}`;
      lines.push({ teamId: teamAId, studentId: m.studentId, playerName: m.fullName, stats: playerStats[key] ?? {} });
    }
    for (const m of roster.teamB) {
      const key = `B-${m.studentId}`;
      lines.push({ teamId: teamBId, studentId: m.studentId, playerName: m.fullName, stats: playerStats[key] ?? {} });
    }
    return lines;
  }, [match.teamAId, match.teamBId, roster, playerStats]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await onSaveDraft({ payloadJson: payload, playerLines: buildPlayerLines() }) as { computed?: Record<string, unknown> };
      setComputedPreview(res?.computed ?? null);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Finalize scorecard? This will lock the scorecard and set the match winner. This action cannot be undone.')) return;
    setFinalizing(true);
    try {
      await onFinalize({ payloadJson: payload, playerLines: buildPlayerLines() });
    } finally {
      setFinalizing(false);
    }
  };

  const isFinal = matchScorecard?.status === 'FINAL';
  const readOnly = isFinal;

  const setPayloadField = (key: string, value: unknown) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const setPlayerStat = (rowKey: string, statKey: string, value: unknown) => {
    setPlayerStats((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? {}), [statKey]: value },
    }));
  };

  const renderField = (f: FieldDef, prefix = '') => {
    const key = prefix ? `${prefix}.${f.key}` : f.key;
    const value = payload[f.key];
    if (f.type === 'number') {
      return (
        <div key={key}>
          <Label>{f.label}</Label>
          <Input
            type="number"
            min={f.min}
            max={f.max}
            step={f.step}
            value={typeof value === 'number' ? value : value ?? ''}
            onChange={(e) => setPayloadField(f.key, e.target.value === '' ? undefined : Number(e.target.value))}
            disabled={readOnly}
          />
        </div>
      );
    }
    if (f.type === 'array' && f.arrayItem) {
      const arr = Array.isArray(payload[f.key]) ? (payload[f.key] as { teamAScore?: number; teamBScore?: number }[]) : [];
      return (
        <div key={key} className="space-y-2">
          <Label>{f.label}</Label>
          {arr.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="A"
                value={item?.teamAScore ?? item?.a ?? ''}
                onChange={(e) => {
                  const next = [...arr];
                  next[i] = { ...next[i], teamAScore: Number(e.target.value || 0), teamBScore: Number(next[i]?.teamBScore ?? 0) };
                  setPayloadField(f.key, next);
                }}
                disabled={readOnly}
                className="w-20"
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="B"
                value={item?.teamBScore ?? item?.b ?? ''}
                onChange={(e) => {
                  const next = [...arr];
                  next[i] = { ...next[i], teamAScore: Number(next[i]?.teamAScore ?? 0), teamBScore: Number(e.target.value || 0) };
                  setPayloadField(f.key, next);
                }}
                disabled={readOnly}
                className="w-20"
              />
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPayloadField(f.key, arr.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPayloadField(f.key, [...arr, { teamAScore: 0, teamBScore: 0 }])}
            >
              Add set
            </Button>
          )}
        </div>
      );
    }
    return (
      <div key={key}>
        <Label>{f.label}</Label>
        <Input
          value={typeof value === 'string' ? value : value ?? ''}
          onChange={(e) => setPayloadField(f.key, e.target.value)}
          disabled={readOnly}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isVolleyballSets && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-sm">Volleyball scoring</p>
          <p>
            Best of{' '}
            {volleyballConstraints.bestOfSets ?? 5} sets · Regular set: first to{' '}
            {volleyballConstraints.setPoints ?? volleyballConstraints.regularSetPoints ?? 25} (win by{' '}
            {volleyballConstraints.winBy ?? 2}) · Deciding set: first to{' '}
            {volleyballConstraints.decidingSetPoints ?? 15} (win by{' '}
            {volleyballConstraints.winBy ?? 2})
          </p>
          <p>
            Enter final set scores for each set. Advanced rally-by-rally stats are optional and can
            be added later without changing this scorecard.
          </p>
        </div>
      )}

      {template.ui?.hints?.length ? (
        <p className="text-sm text-muted-foreground">{template.ui.hints.join(' ')}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Match score</CardTitle>
          <p className="text-sm text-muted-foreground">
            {match.teamAName ?? 'Team A'} vs {match.teamBName ?? 'Team B'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(template.match.sharedFields ?? []).map((f) => renderField(f))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {template.match.teamFields.map((f) => (
              <div key={f.key}>{renderField(f)}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {template.players?.enabled && (roster.teamA.length > 0 || roster.teamB.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Player stats</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Player</th>
                  {template.players.columns.map((c) => (
                    <th key={c.key} className="text-left p-2">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.teamA.map((m) => (
                  <tr key={`A-${m.studentId}`}>
                    <td className="p-2">{m.fullName}</td>
                    {template.players!.columns.map((c) => (
                      <td key={c.key} className="p-2">
                        <Input
                          type="number"
                          min={c.min}
                          max={c.max}
                          className="w-20 h-8"
                          value={Number((playerStats[`A-${m.studentId}`]?.[c.key] ?? '')) || ''}
                          onChange={(e) => setPlayerStat(`A-${m.studentId}`, c.key, e.target.value === '' ? undefined : Number(e.target.value))}
                          disabled={readOnly}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {roster.teamB.map((m) => (
                  <tr key={`B-${m.studentId}`}>
                    <td className="p-2">{m.fullName}</td>
                    {template.players!.columns.map((c) => (
                      <td key={c.key} className="p-2">
                        <Input
                          type="number"
                          min={c.min}
                          max={c.max}
                          className="w-20 h-8"
                          value={Number((playerStats[`B-${m.studentId}`]?.[c.key] ?? '')) || ''}
                          onChange={(e) => setPlayerStat(`B-${m.studentId}`, c.key, e.target.value === '' ? undefined : Number(e.target.value))}
                          disabled={readOnly}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {computedPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Computed result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Summary A:</strong> {(computedPreview as { summaryA?: string }).summaryA ?? ''}</p>
            <p><strong>Summary B:</strong> {(computedPreview as { summaryB?: string }).summaryB ?? ''}</p>
            <p><strong>Winner:</strong> {(computedPreview as { winnerTeamId?: string }).winnerTeamId ? (computedPreview as { winnerTeamId: string }).winnerTeamId === match.teamAId ? match.teamAName : match.teamBName : 'Tie / TBD'}</p>
            <p><strong>Margin:</strong> {(computedPreview as { marginText?: string }).marginText ?? ''}</p>
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save draft'}
          </Button>
          {canFinalize && (
            <Button variant="default" onClick={handleFinalize} disabled={finalizing}>
              Finalize
            </Button>
          )}
        </div>
      )}

      {isFinal && <p className="text-sm text-muted-foreground">This scorecard is finalized and cannot be edited.</p>}
    </div>
  );
}

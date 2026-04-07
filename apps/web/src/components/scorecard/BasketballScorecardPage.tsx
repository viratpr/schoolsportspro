'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Template = {
  sportKey: string;
  displayName: string;
};

type RosterMember = { studentId: string; fullName: string; admissionNo: string };

type PlayerRow = {
  studentId: string;
  playerName: string;
  jerseyNo: string;
  position: string;
  starter: boolean;
  minutes: number;
  twoPM: number;
  twoPA: number;
  threePM: number;
  threePA: number;
  ftm: number;
  fta: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
};

type BasketballFormValues = {
  teamScores: {
    teamA: { quarters: number[]; foulsByQuarter: number[] };
    teamB: { quarters: number[]; foulsByQuarter: number[] };
  };
  playerStats: {
    teamA: PlayerRow[];
    teamB: PlayerRow[];
  };
};

type Props = {
  template: Template;
  match: { teamAId: string | null; teamBId: string | null; teamAName: string | null; teamBName: string | null };
  matchScorecard: {
    status: string;
    payloadJson: Record<string, unknown>;
    computedJson: Record<string, unknown> | null;
  } | null;
  roster: { teamA: RosterMember[]; teamB: RosterMember[] };
  onSaveDraft: (body: {
    payloadJson: Record<string, unknown>;
    playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[];
  }) => Promise<unknown>;
  onFinalize: (body: {
    payloadJson: Record<string, unknown>;
    playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[];
  }) => Promise<unknown>;
  canFinalize: boolean;
};

const quartersSchema = z.array(z.coerce.number().min(0)).length(5);
const playerSchema = z.object({
  studentId: z.string(),
  playerName: z.string(),
  jerseyNo: z.string(),
  position: z.string(),
  starter: z.boolean(),
  minutes: z.coerce.number().min(0),
  twoPM: z.coerce.number().min(0),
  twoPA: z.coerce.number().min(0),
  threePM: z.coerce.number().min(0),
  threePA: z.coerce.number().min(0),
  ftm: z.coerce.number().min(0),
  fta: z.coerce.number().min(0),
  rebounds: z.coerce.number().min(0),
  assists: z.coerce.number().min(0),
  steals: z.coerce.number().min(0),
  blocks: z.coerce.number().min(0),
  turnovers: z.coerce.number().min(0),
  personalFouls: z.coerce.number().min(0),
});

const formSchema = z.object({
  teamScores: z.object({
    teamA: z.object({
      quarters: quartersSchema,
      foulsByQuarter: quartersSchema,
    }),
    teamB: z.object({
      quarters: quartersSchema,
      foulsByQuarter: quartersSchema,
    }),
  }),
  playerStats: z.object({
    teamA: z.array(playerSchema),
    teamB: z.array(playerSchema),
  }),
});

const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'] as const;

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function buildPlayerRows(roster: RosterMember[]): PlayerRow[] {
  return roster.map((m, idx) => ({
    studentId: m.studentId,
    playerName: m.fullName,
    jerseyNo: '',
    position: '',
    starter: idx < 5,
    minutes: 0,
    twoPM: 0,
    twoPA: 0,
    threePM: 0,
    threePA: 0,
    ftm: 0,
    fta: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    personalFouls: 0,
  }));
}

function quarterTotal(quarters: number[]) {
  return (quarters ?? []).reduce((acc, n) => acc + toNumber(n), 0);
}

function rowPoints(row: PlayerRow) {
  return row.twoPM * 2 + row.threePM * 3 + row.ftm;
}

function teamPoints(rows: PlayerRow[]) {
  return (rows ?? []).reduce((acc, row) => acc + rowPoints(row), 0);
}

function totalsForRows(rows: PlayerRow[]) {
  return {
    minutes: rows.reduce((s, r) => s + toNumber(r.minutes), 0),
    points: rows.reduce((s, r) => s + rowPoints(r), 0),
    twoPM: rows.reduce((s, r) => s + toNumber(r.twoPM), 0),
    twoPA: rows.reduce((s, r) => s + toNumber(r.twoPA), 0),
    threePM: rows.reduce((s, r) => s + toNumber(r.threePM), 0),
    threePA: rows.reduce((s, r) => s + toNumber(r.threePA), 0),
    ftm: rows.reduce((s, r) => s + toNumber(r.ftm), 0),
    fta: rows.reduce((s, r) => s + toNumber(r.fta), 0),
    rebounds: rows.reduce((s, r) => s + toNumber(r.rebounds), 0),
    assists: rows.reduce((s, r) => s + toNumber(r.assists), 0),
    steals: rows.reduce((s, r) => s + toNumber(r.steals), 0),
    blocks: rows.reduce((s, r) => s + toNumber(r.blocks), 0),
    turnovers: rows.reduce((s, r) => s + toNumber(r.turnovers), 0),
    personalFouls: rows.reduce((s, r) => s + toNumber(r.personalFouls), 0),
  };
}

export function BasketballScorecardPage({
  match,
  matchScorecard,
  roster,
  onSaveDraft,
  onFinalize,
  canFinalize,
}: Props) {
  const initialPayload = (matchScorecard?.payloadJson ?? {}) as Record<string, unknown>;
  const form = useForm<BasketballFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      teamScores: {
        teamA: {
          quarters: [
            toNumber(initialPayload.q1TeamA),
            toNumber(initialPayload.q2TeamA),
            toNumber(initialPayload.q3TeamA),
            toNumber(initialPayload.q4TeamA),
            toNumber(initialPayload.otTeamA),
          ],
          foulsByQuarter: [
            toNumber(initialPayload.q1FoulsA),
            toNumber(initialPayload.q2FoulsA),
            toNumber(initialPayload.q3FoulsA),
            toNumber(initialPayload.q4FoulsA),
            toNumber(initialPayload.otFoulsA),
          ],
        },
        teamB: {
          quarters: [
            toNumber(initialPayload.q1TeamB),
            toNumber(initialPayload.q2TeamB),
            toNumber(initialPayload.q3TeamB),
            toNumber(initialPayload.q4TeamB),
            toNumber(initialPayload.otTeamB),
          ],
          foulsByQuarter: [
            toNumber(initialPayload.q1FoulsB),
            toNumber(initialPayload.q2FoulsB),
            toNumber(initialPayload.q3FoulsB),
            toNumber(initialPayload.q4FoulsB),
            toNumber(initialPayload.otFoulsB),
          ],
        },
      },
      playerStats: {
        teamA: buildPlayerRows(roster.teamA),
        teamB: buildPlayerRows(roster.teamB),
      },
    },
  });

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [computedPreview, setComputedPreview] = useState<Record<string, unknown> | null>(
    matchScorecard?.computedJson ?? null
  );
  const [activeQuarterCell, setActiveQuarterCell] = useState<string | null>(null);
  const [activePlayerCell, setActivePlayerCell] = useState<string | null>(null);
  const [showFouls, setShowFouls] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quarterRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const playerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isFinal = matchScorecard?.status === 'FINAL';
  const readOnly = isFinal;

  const quartersA = form.watch('teamScores.teamA.quarters');
  const quartersB = form.watch('teamScores.teamB.quarters');
  const playersA = form.watch('playerStats.teamA');
  const playersB = form.watch('playerStats.teamB');

  const quarterTotalA = quarterTotal(quartersA ?? []);
  const quarterTotalB = quarterTotal(quartersB ?? []);
  const playersTotalA = teamPoints(playersA ?? []);
  const playersTotalB = teamPoints(playersB ?? []);

  const winner =
    quarterTotalA === quarterTotalB
      ? 'Tie'
      : quarterTotalA > quarterTotalB
        ? match.teamAName ?? 'Team A'
        : match.teamBName ?? 'Team B';
  const margin = Math.abs(quarterTotalA - quarterTotalB);

  const mismatchA = quarterTotalA !== playersTotalA;
  const mismatchB = quarterTotalB !== playersTotalB;

  const autoSaveDraft = async () => {
    if (readOnly || saving || finalizing) return;
    const values = form.getValues();
    const payloadJson: Record<string, unknown> = {
      q1TeamA: toNumber(values.teamScores.teamA.quarters[0]),
      q2TeamA: toNumber(values.teamScores.teamA.quarters[1]),
      q3TeamA: toNumber(values.teamScores.teamA.quarters[2]),
      q4TeamA: toNumber(values.teamScores.teamA.quarters[3]),
      otTeamA: toNumber(values.teamScores.teamA.quarters[4]),
      q1TeamB: toNumber(values.teamScores.teamB.quarters[0]),
      q2TeamB: toNumber(values.teamScores.teamB.quarters[1]),
      q3TeamB: toNumber(values.teamScores.teamB.quarters[2]),
      q4TeamB: toNumber(values.teamScores.teamB.quarters[3]),
      otTeamB: toNumber(values.teamScores.teamB.quarters[4]),
      teamAScore: quarterTotal(values.teamScores.teamA.quarters),
      teamBScore: quarterTotal(values.teamScores.teamB.quarters),
      q1FoulsA: toNumber(values.teamScores.teamA.foulsByQuarter[0]),
      q2FoulsA: toNumber(values.teamScores.teamA.foulsByQuarter[1]),
      q3FoulsA: toNumber(values.teamScores.teamA.foulsByQuarter[2]),
      q4FoulsA: toNumber(values.teamScores.teamA.foulsByQuarter[3]),
      otFoulsA: toNumber(values.teamScores.teamA.foulsByQuarter[4]),
      q1FoulsB: toNumber(values.teamScores.teamB.foulsByQuarter[0]),
      q2FoulsB: toNumber(values.teamScores.teamB.foulsByQuarter[1]),
      q3FoulsB: toNumber(values.teamScores.teamB.foulsByQuarter[2]),
      q4FoulsB: toNumber(values.teamScores.teamB.foulsByQuarter[3]),
      otFoulsB: toNumber(values.teamScores.teamB.foulsByQuarter[4]),
      teamAFouls: values.teamScores.teamA.foulsByQuarter.reduce((s, n) => s + toNumber(n), 0),
      teamBFouls: values.teamScores.teamB.foulsByQuarter.reduce((s, n) => s + toNumber(n), 0),
    };

    const teamAId = match.teamAId ?? '';
    const teamBId = match.teamBId ?? '';
    const playerLines = [
      ...values.playerStats.teamA.map((p) => ({
        teamId: teamAId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: {
          jerseyNo: p.jerseyNo,
          position: p.position,
          starter: p.starter,
          minutes: toNumber(p.minutes),
          points: rowPoints(p),
          twoPM: toNumber(p.twoPM),
          twoPA: toNumber(p.twoPA),
          threePM: toNumber(p.threePM),
          threePA: toNumber(p.threePA),
          ftm: toNumber(p.ftm),
          fta: toNumber(p.fta),
          rebounds: toNumber(p.rebounds),
          assists: toNumber(p.assists),
          steals: toNumber(p.steals),
          blocks: toNumber(p.blocks),
          turnovers: toNumber(p.turnovers),
          personalFouls: toNumber(p.personalFouls),
        },
      })),
      ...values.playerStats.teamB.map((p) => ({
        teamId: teamBId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: {
          jerseyNo: p.jerseyNo,
          position: p.position,
          starter: p.starter,
          minutes: toNumber(p.minutes),
          points: rowPoints(p),
          twoPM: toNumber(p.twoPM),
          twoPA: toNumber(p.twoPA),
          threePM: toNumber(p.threePM),
          threePA: toNumber(p.threePA),
          ftm: toNumber(p.ftm),
          fta: toNumber(p.fta),
          rebounds: toNumber(p.rebounds),
          assists: toNumber(p.assists),
          steals: toNumber(p.steals),
          blocks: toNumber(p.blocks),
          turnovers: toNumber(p.turnovers),
          personalFouls: toNumber(p.personalFouls),
        },
      })),
    ];

    setSaving(true);
    try {
      const res = (await onSaveDraft({ payloadJson, playerLines })) as { computed?: Record<string, unknown> };
      setComputedPreview(res?.computed ?? null);
    } finally {
      setSaving(false);
    }
  };

  const scheduleAutosave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void autoSaveDraft();
    }, 600);
  };

  useEffect(() => {
    if (readOnly) return;
    const id = setInterval(() => {
      if (form.formState.isDirty && !saving && !finalizing) {
        void autoSaveDraft();
      }
    }, 10000);
    return () => clearInterval(id);
  }, [form.formState.isDirty, readOnly, saving, finalizing]);

  const handleFinalize = async () => {
    if (!canFinalize || readOnly) return;
    if (!window.confirm('Finalize scorecard? This will lock editing.')) return;
    setFinalizing(true);
    try {
      const values = form.getValues();
      const payloadJson: Record<string, unknown> = {
        q1TeamA: toNumber(values.teamScores.teamA.quarters[0]),
        q2TeamA: toNumber(values.teamScores.teamA.quarters[1]),
        q3TeamA: toNumber(values.teamScores.teamA.quarters[2]),
        q4TeamA: toNumber(values.teamScores.teamA.quarters[3]),
        otTeamA: toNumber(values.teamScores.teamA.quarters[4]),
        q1TeamB: toNumber(values.teamScores.teamB.quarters[0]),
        q2TeamB: toNumber(values.teamScores.teamB.quarters[1]),
        q3TeamB: toNumber(values.teamScores.teamB.quarters[2]),
        q4TeamB: toNumber(values.teamScores.teamB.quarters[3]),
        otTeamB: toNumber(values.teamScores.teamB.quarters[4]),
        teamAScore: quarterTotal(values.teamScores.teamA.quarters),
        teamBScore: quarterTotal(values.teamScores.teamB.quarters),
      };
      const teamAId = match.teamAId ?? '';
      const teamBId = match.teamBId ?? '';
      const playerLines = [
        ...values.playerStats.teamA.map((p) => ({ teamId: teamAId, studentId: p.studentId, playerName: p.playerName, stats: p })),
        ...values.playerStats.teamB.map((p) => ({ teamId: teamBId, studentId: p.studentId, playerName: p.playerName, stats: p })),
      ];
      await onFinalize({ payloadJson, playerLines });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-10">
        <div className="space-y-4 lg:col-span-3">
          <BasketballSummaryCard
            teamAName={match.teamAName ?? 'Team A'}
            teamBName={match.teamBName ?? 'Team B'}
            totalA={quarterTotalA}
            totalB={quarterTotalB}
            winner={winner}
            margin={margin}
            status={isFinal ? 'Final' : 'Draft'}
            mismatchA={mismatchA}
            mismatchB={mismatchB}
          />
          <BasketballQuarterGrid
            form={form}
            readOnly={readOnly}
            activeQuarterCell={activeQuarterCell}
            setActiveQuarterCell={setActiveQuarterCell}
            quarterRefs={quarterRefs}
            scheduleAutosave={scheduleAutosave}
          />
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{match.teamAName ?? 'Team A'} (Quarter)</span>
                <span className="font-semibold">{quarterTotalA}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{match.teamAName ?? 'Team A'} (Players)</span>
                <span className="font-semibold">{playersTotalA}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{match.teamBName ?? 'Team B'} (Quarter)</span>
                <span className="font-semibold">{quarterTotalB}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{match.teamBName ?? 'Team B'} (Players)</span>
                <span className="font-semibold">{playersTotalB}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-7">
          <BasketballPlayerStatsTable
            form={form}
            readOnly={readOnly}
            activePlayerCell={activePlayerCell}
            setActivePlayerCell={setActivePlayerCell}
            playerRefs={playerRefs}
            scheduleAutosave={scheduleAutosave}
          />
        </div>
      </div>

      {computedPreview && (
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Computed Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Summary A:</strong> {(computedPreview as { summaryA?: string }).summaryA ?? ''}</p>
            <p><strong>Summary B:</strong> {(computedPreview as { summaryB?: string }).summaryB ?? ''}</p>
            <p><strong>Winner:</strong> {winner === 'Tie' ? 'Tie / TBD' : `${winner} won by ${margin} points`}</p>
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void autoSaveDraft()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button variant="secondary" onClick={() => void autoSaveDraft()} disabled={saving}>
            Auto Calculate Winner
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFouls((v) => !v)}
          >
            {showFouls ? 'Hide Team Fouls' : 'Show Team Fouls'}
          </Button>
          {canFinalize && (
            <Button onClick={() => void handleFinalize()} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Finalize'}
            </Button>
          )}
        </div>
      )}

      {showFouls && (
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Team Fouls by Quarter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(['teamA', 'teamB'] as const).map((teamKey) => (
              <div key={teamKey} className="rounded border p-3">
                <p className="mb-2 font-medium">{teamKey === 'teamA' ? match.teamAName ?? 'Team A' : match.teamBName ?? 'Team B'}</p>
                <div className="grid grid-cols-5 gap-2">
                  {quarterLabels.map((label, idx) => {
                    const path = `teamScores.${teamKey}.foulsByQuarter.${idx}` as Path<BasketballFormValues>;
                    return (
                      <div key={label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 text-center"
                          disabled={readOnly}
                          {...form.register(path, { valueAsNumber: true })}
                          onBlur={scheduleAutosave}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {readOnly && <p className="text-sm text-muted-foreground">This scorecard is finalized and cannot be edited.</p>}
    </div>
  );
}

function BasketballSummaryCard({
  teamAName,
  teamBName,
  totalA,
  totalB,
  winner,
  margin,
  status,
  mismatchA,
  mismatchB,
}: {
  teamAName: string;
  teamBName: string;
  totalA: number;
  totalB: number;
  winner: string;
  margin: number;
  status: 'Draft' | 'Final';
  mismatchA: boolean;
  mismatchB: boolean;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Match Summary</span>
          <Badge variant={status === 'Final' ? 'success' : 'secondary'}>{status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
          <span>{teamAName}</span>
          <span className="text-lg font-semibold text-blue-600">{totalA}</span>
        </div>
        <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
          <span>{teamBName}</span>
          <span className="text-lg font-semibold text-blue-600">{totalB}</span>
        </div>
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
          {winner === 'Tie' ? 'Game tied' : `${winner} won by ${margin} points`}
        </div>
        {(mismatchA || mismatchB) && (
          <div className="space-y-1">
            {mismatchA && <Badge variant="warning">{teamAName} total mismatch</Badge>}
            {mismatchB && <Badge variant="warning">{teamBName} total mismatch</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BasketballQuarterGrid({
  form,
  readOnly,
  activeQuarterCell,
  setActiveQuarterCell,
  quarterRefs,
  scheduleAutosave,
}: {
  form: ReturnType<typeof useForm<BasketballFormValues>>;
  readOnly: boolean;
  activeQuarterCell: string | null;
  setActiveQuarterCell: (v: string | null) => void;
  quarterRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  scheduleAutosave: () => void;
}) {
  const moveQuarter = (team: 'A' | 'B', colIdx: number) => {
    quarterRefs.current[`${team}-${colIdx}`]?.focus();
  };

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Quarter Scores</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border px-2 py-1 text-left">Team</th>
              {quarterLabels.map((q) => (
                <th key={q} className="border px-2 py-1 text-center">{q}</th>
              ))}
              <th className="border px-2 py-1 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {(['A', 'B'] as const).map((team) => (
              <tr key={team}>
                <td className="border px-2 py-1 font-medium">{team === 'A' ? 'Team A' : 'Team B'}</td>
                {quarterLabels.map((_, idx) => {
                  const path = `teamScores.${team === 'A' ? 'teamA' : 'teamB'}.quarters.${idx}` as Path<BasketballFormValues>;
                  const refKey = `${team}-${idx}`;
                  return (
                    <td key={refKey} className="border p-1">
                      <Input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        className={`h-8 w-14 text-center ${activeQuarterCell === refKey ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                        {...form.register(path, { valueAsNumber: true })}
                        onFocus={() => setActiveQuarterCell(refKey)}
                        onBlur={() => {
                          setActiveQuarterCell(null);
                          scheduleAutosave();
                        }}
                        onKeyDown={(e) => {
                          if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
                            e.preventDefault();
                            if (e.key === 'ArrowRight') moveQuarter(team, Math.min(4, idx + 1));
                            if (e.key === 'ArrowLeft') moveQuarter(team, Math.max(0, idx - 1));
                            if (e.key === 'ArrowDown' || e.key === 'Enter') moveQuarter(team === 'A' ? 'B' : 'A', idx);
                            if (e.key === 'ArrowUp') moveQuarter(team === 'B' ? 'A' : 'B', idx);
                          }
                        }}
                        ref={(el) => {
                          form.register(path).ref(el);
                          quarterRefs.current[refKey] = el;
                        }}
                      />
                    </td>
                  );
                })}
                <td className="border px-2 py-1 text-center font-semibold text-blue-700">
                  {quarterTotal(
                    form.watch(`teamScores.${team === 'A' ? 'teamA' : 'teamB'}.quarters`) ?? []
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function BasketballPlayerStatsTable({
  form,
  readOnly,
  activePlayerCell,
  setActivePlayerCell,
  playerRefs,
  scheduleAutosave,
}: {
  form: ReturnType<typeof useForm<BasketballFormValues>>;
  readOnly: boolean;
  activePlayerCell: string | null;
  setActivePlayerCell: (v: string | null) => void;
  playerRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  scheduleAutosave: () => void;
}) {
  const teamA = form.watch('playerStats.teamA');
  const teamB = form.watch('playerStats.teamB');
  const statColumns: { key: string; label: string; computed?: boolean }[] = [
    { key: 'jerseyNo', label: '#' },
    { key: 'position', label: 'Pos' },
    { key: 'minutes', label: 'MIN' },
    { key: 'points', label: 'PTS', computed: true },
    { key: 'twoPM', label: '2PM' },
    { key: 'twoPA', label: '2PA' },
    { key: 'threePM', label: '3PM' },
    { key: 'threePA', label: '3PA' },
    { key: 'ftm', label: 'FTM' },
    { key: 'fta', label: 'FTA' },
    { key: 'rebounds', label: 'REB' },
    { key: 'assists', label: 'AST' },
    { key: 'steals', label: 'STL' },
    { key: 'blocks', label: 'BLK' },
    { key: 'turnovers', label: 'TO' },
    { key: 'personalFouls', label: 'PF' },
  ] as const;

  const movePlayerCell = (teamKey: 'teamA' | 'teamB', row: number, col: number) => {
    const key = `${teamKey}-${row}-${col}`;
    playerRefs.current[key]?.focus();
  };

  const renderTeamTable = (teamKey: 'teamA' | 'teamB', rows: PlayerRow[]) => {
    const totals = totalsForRows(rows ?? []);
    return (
      <div className="max-h-[68vh] overflow-auto rounded border">
        <table className="w-full min-w-[78rem] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th className="sticky left-0 z-30 border bg-slate-50 px-2 py-1 text-left">Player</th>
              {statColumns.map((c) => (
                <th key={c.key} className="border px-2 py-1 text-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.studentId}>
                <td className="sticky left-0 z-10 border bg-white px-2 py-1 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{row.playerName}</span>
                    {row.starter ? <Badge variant="outline">Starter</Badge> : <Badge variant="secondary">Bench</Badge>}
                  </div>
                </td>
                {statColumns.map((col, colIdx) => {
                  const path = `playerStats.${teamKey}.${rowIdx}.${col.key}` as Path<BasketballFormValues>;
                  const refKey = `${teamKey}-${rowIdx}-${colIdx}`;
                  const activeKey = `${teamKey}-${rowIdx}-${colIdx}`;
                  const isText = col.key === 'jerseyNo' || col.key === 'position';
                  if (col.computed) {
                    return (
                      <td key={col.key} className="border px-2 py-1 text-center font-semibold text-blue-700">
                        {rowPoints(row)}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} className="border p-1">
                      <Input
                        type={isText ? 'text' : 'number'}
                        min={isText ? undefined : 0}
                        disabled={readOnly}
                        className={`h-8 ${isText ? 'w-16 text-center' : 'w-14 text-center'} ${activePlayerCell === activeKey ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                        {...form.register(path, { valueAsNumber: !isText })}
                        onFocus={() => setActivePlayerCell(activeKey)}
                        onBlur={() => {
                          setActivePlayerCell(null);
                          scheduleAutosave();
                        }}
                        onKeyDown={(e) => {
                          if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
                            e.preventDefault();
                            if (e.key === 'ArrowRight') movePlayerCell(teamKey, rowIdx, Math.min(statColumns.length - 1, colIdx + 1));
                            if (e.key === 'ArrowLeft') movePlayerCell(teamKey, rowIdx, Math.max(0, colIdx - 1));
                            if (e.key === 'ArrowDown' || e.key === 'Enter') movePlayerCell(teamKey, Math.min(rows.length - 1, rowIdx + 1), colIdx);
                            if (e.key === 'ArrowUp') movePlayerCell(teamKey, Math.max(0, rowIdx - 1), colIdx);
                          }
                        }}
                        ref={(el) => {
                          form.register(path).ref(el);
                          playerRefs.current[refKey] = el;
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="sticky left-0 z-10 border bg-slate-50 px-2 py-1">Totals</td>
              {statColumns.map((col) => {
                const val =
                  col.key === 'minutes'
                    ? totals.minutes
                    : col.key === 'points'
                      ? totals.points
                      : col.key === 'twoPM'
                        ? totals.twoPM
                        : col.key === 'twoPA'
                          ? totals.twoPA
                          : col.key === 'threePM'
                            ? totals.threePM
                            : col.key === 'threePA'
                              ? totals.threePA
                              : col.key === 'ftm'
                                ? totals.ftm
                                : col.key === 'fta'
                                  ? totals.fta
                                  : col.key === 'rebounds'
                                    ? totals.rebounds
                                    : col.key === 'assists'
                                      ? totals.assists
                                      : col.key === 'steals'
                                        ? totals.steals
                                        : col.key === 'blocks'
                                          ? totals.blocks
                                          : col.key === 'turnovers'
                                            ? totals.turnovers
                                            : col.key === 'personalFouls'
                                              ? totals.personalFouls
                                              : '-';
                return (
                  <td key={col.key} className="border px-2 py-1 text-center">{val}</td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Player Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="teamA" className="w-full">
          <TabsList>
            <TabsTrigger value="teamA">Team A Stats</TabsTrigger>
            <TabsTrigger value="teamB">Team B Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="teamA" className="mt-3">
            {renderTeamTable('teamA', teamA ?? [])}
          </TabsContent>
          <TabsContent value="teamB" className="mt-3">
            {renderTeamTable('teamB', teamB ?? [])}
          </TabsContent>
        </Tabs>

        <div className="mt-3 space-y-2 md:hidden">
          {[...(teamA ?? []), ...(teamB ?? [])].map((row) => (
            <Card key={row.studentId}>
              <CardContent className="pt-4">
                <p className="font-medium">{row.playerName}</p>
                <p className="text-xs text-muted-foreground">
                  PTS {rowPoints(row)} · REB {row.rebounds} · AST {row.assists} · PF {row.personalFouls}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


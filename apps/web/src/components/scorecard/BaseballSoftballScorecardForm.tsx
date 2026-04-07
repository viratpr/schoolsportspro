'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm, type UseFormReturn, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FieldDef = {
  key: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
};

type PlayerColumnDef = { key: string; label: string; type: string; min?: number; max?: number };

type Template = {
  sportKey: string;
  displayName: string;
  match: {
    sharedFields?: FieldDef[];
    teamFields: FieldDef[];
  };
  players?: {
    enabled: boolean;
    columns: PlayerColumnDef[];
  };
};

type RosterMember = { studentId: string; fullName: string; admissionNo: string };

type PlayerRow = {
  studentId: string;
  playerName: string;
  battingOrder: number;
  position: string;
  inningsPlayed: string;
  ab: number;
  runs: number;
  hits: number;
  runsBattedIn: number;
  walks: number;
  strikeOuts: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  hitByPitch: number;
  sacrificeFly: number;
  sacrificeHit: number;
};

type BaseballFormValues = {
  inningsA: number[];
  inningsB: number[];
  hitsA: number;
  hitsB: number;
  errorsA: number;
  errorsB: number;
  leftOnBaseA: number;
  leftOnBaseB: number;
  playersA: PlayerRow[];
  playersB: PlayerRow[];
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

function toNonNegative(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function buildPlayerRows(roster: RosterMember[], existing: Record<string, unknown>[]): PlayerRow[] {
  return roster.map((r, idx) => {
    const e = (existing[idx] ?? {}) as Record<string, unknown>;
    return {
      studentId: r.studentId,
      playerName: r.fullName,
      battingOrder: toNonNegative(e.battingOrder, idx + 1),
      position: typeof e.position === 'string' ? e.position : '',
      inningsPlayed: typeof e.inningsPlayed === 'string' ? e.inningsPlayed : '',
      ab: toNonNegative(e.ab),
      runs: toNonNegative(e.runs),
      hits: toNonNegative(e.hits),
      runsBattedIn: toNonNegative(e.runsBattedIn),
      walks: toNonNegative(e.walks),
      strikeOuts: toNonNegative(e.strikeOuts),
      singles: toNonNegative(e.singles),
      doubles: toNonNegative(e.doubles),
      triples: toNonNegative(e.triples),
      homeRuns: toNonNegative(e.homeRuns),
      hitByPitch: toNonNegative(e.hitByPitch),
      sacrificeFly: toNonNegative(e.sacrificeFly),
      sacrificeHit: toNonNegative(e.sacrificeHit),
    };
  });
}

function buildSchema() {
  const playerSchema = z.object({
    studentId: z.string(),
    playerName: z.string(),
    battingOrder: z.coerce.number().min(0),
    position: z.string(),
    inningsPlayed: z.string(),
    ab: z.coerce.number().min(0),
    runs: z.coerce.number().min(0),
    hits: z.coerce.number().min(0),
    runsBattedIn: z.coerce.number().min(0),
    walks: z.coerce.number().min(0),
    strikeOuts: z.coerce.number().min(0),
    singles: z.coerce.number().min(0),
    doubles: z.coerce.number().min(0),
    triples: z.coerce.number().min(0),
    homeRuns: z.coerce.number().min(0),
    hitByPitch: z.coerce.number().min(0),
    sacrificeFly: z.coerce.number().min(0),
    sacrificeHit: z.coerce.number().min(0),
  });

  return z.object({
    inningsA: z.array(z.coerce.number().min(0)).length(12),
    inningsB: z.array(z.coerce.number().min(0)).length(12),
    hitsA: z.coerce.number().min(0),
    hitsB: z.coerce.number().min(0),
    errorsA: z.coerce.number().min(0),
    errorsB: z.coerce.number().min(0),
    leftOnBaseA: z.coerce.number().min(0),
    leftOnBaseB: z.coerce.number().min(0),
    playersA: z.array(playerSchema),
    playersB: z.array(playerSchema),
  });
}

function teamTotal(innings: number[]) {
  return innings.reduce((sum, v) => sum + toNonNegative(v), 0);
}

export function BaseballSoftballScorecardForm({
  template,
  match,
  matchScorecard,
  roster,
  onSaveDraft,
  onFinalize,
  canFinalize,
}: Props) {
  const payload = (matchScorecard?.payloadJson ?? {}) as Record<string, unknown>;
  const inningsA = Array.from({ length: 12 }, (_, i) => toNonNegative(payload[`inning${i + 1}A`]));
  const inningsB = Array.from({ length: 12 }, (_, i) => toNonNegative(payload[`inning${i + 1}B`]));

  const form = useForm<BaseballFormValues>({
    resolver: zodResolver(buildSchema()),
    defaultValues: {
      inningsA,
      inningsB,
      hitsA: toNonNegative(payload.hitsA),
      hitsB: toNonNegative(payload.hitsB),
      errorsA: toNonNegative(payload.errorsA),
      errorsB: toNonNegative(payload.errorsB),
      leftOnBaseA: toNonNegative(payload.leftOnBaseA),
      leftOnBaseB: toNonNegative(payload.leftOnBaseB),
      playersA: buildPlayerRows(roster.teamA, []),
      playersB: buildPlayerRows(roster.teamB, []),
    },
    mode: 'onChange',
  });

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [computedPreview, setComputedPreview] = useState<Record<string, unknown> | null>(
    matchScorecard?.computedJson ?? null
  );
  const [activeInningCell, setActiveInningCell] = useState<string | null>(null);
  const [activePlayerRow, setActivePlayerRow] = useState<string | null>(null);

  const isFinal = matchScorecard?.status === 'FINAL';
  const readOnly = isFinal;

  const inningsAWatch = form.watch('inningsA');
  const inningsBWatch = form.watch('inningsB');
  const totalA = teamTotal(inningsAWatch ?? []);
  const totalB = teamTotal(inningsBWatch ?? []);
  const winnerText =
    totalA === totalB
      ? 'Match tied'
      : `${totalA > totalB ? match.teamAName ?? 'Team A' : match.teamBName ?? 'Team B'} won by ${Math.abs(totalA - totalB)} runs`;

  const playerColumns = useMemo(
    () =>
      template.players?.columns?.filter((c) =>
        [
          'battingOrder',
          'position',
          'inningsPlayed',
          'ab',
          'runs',
          'hits',
          'runsBattedIn',
          'walks',
          'strikeOuts',
          'singles',
          'doubles',
          'triples',
          'homeRuns',
          'hitByPitch',
          'sacrificeFly',
          'sacrificeHit',
        ].includes(c.key)
      ) ?? [],
    [template.players?.columns]
  );

  const inningRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const playerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const moveInningFocus = (team: 'A' | 'B', inningIdx: number) => {
    const key = `${team}-${inningIdx}`;
    inningRefs.current[key]?.focus();
  };

  const handleSaveDraft = async () => {
    const values = form.getValues();
    const nextPayload: Record<string, unknown> = { ...payload };
    for (let i = 0; i < 12; i++) {
      nextPayload[`inning${i + 1}A`] = toNonNegative(values.inningsA[i]);
      nextPayload[`inning${i + 1}B`] = toNonNegative(values.inningsB[i]);
    }
    nextPayload.teamAScore = teamTotal(values.inningsA);
    nextPayload.teamBScore = teamTotal(values.inningsB);
    nextPayload.hitsA = toNonNegative(values.hitsA);
    nextPayload.hitsB = toNonNegative(values.hitsB);
    nextPayload.errorsA = toNonNegative(values.errorsA);
    nextPayload.errorsB = toNonNegative(values.errorsB);
    nextPayload.leftOnBaseA = toNonNegative(values.leftOnBaseA);
    nextPayload.leftOnBaseB = toNonNegative(values.leftOnBaseB);

    const teamAId = match.teamAId ?? '';
    const teamBId = match.teamBId ?? '';
    const playerLines = [
      ...values.playersA.map((p) => ({
        teamId: teamAId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: {
          battingOrder: p.battingOrder,
          position: p.position,
          inningsPlayed: p.inningsPlayed,
          ab: p.ab,
          runs: p.runs,
          hits: p.hits,
          runsBattedIn: p.runsBattedIn,
          walks: p.walks,
          strikeOuts: p.strikeOuts,
          singles: p.singles,
          doubles: p.doubles,
          triples: p.triples,
          homeRuns: p.homeRuns,
          hitByPitch: p.hitByPitch,
          sacrificeFly: p.sacrificeFly,
          sacrificeHit: p.sacrificeHit,
        },
      })),
      ...values.playersB.map((p) => ({
        teamId: teamBId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: {
          battingOrder: p.battingOrder,
          position: p.position,
          inningsPlayed: p.inningsPlayed,
          ab: p.ab,
          runs: p.runs,
          hits: p.hits,
          runsBattedIn: p.runsBattedIn,
          walks: p.walks,
          strikeOuts: p.strikeOuts,
          singles: p.singles,
          doubles: p.doubles,
          triples: p.triples,
          homeRuns: p.homeRuns,
          hitByPitch: p.hitByPitch,
          sacrificeFly: p.sacrificeFly,
          sacrificeHit: p.sacrificeHit,
        },
      })),
    ];

    setSaving(true);
    try {
      const res = (await onSaveDraft({ payloadJson: nextPayload, playerLines })) as { computed?: Record<string, unknown> };
      setComputedPreview(res?.computed ?? null);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Finalize scorecard? This will lock the scorecard and set the match winner.')) return;
    const values = form.getValues();
    const nextPayload: Record<string, unknown> = { ...payload };
    for (let i = 0; i < 12; i++) {
      nextPayload[`inning${i + 1}A`] = toNonNegative(values.inningsA[i]);
      nextPayload[`inning${i + 1}B`] = toNonNegative(values.inningsB[i]);
    }
    nextPayload.teamAScore = teamTotal(values.inningsA);
    nextPayload.teamBScore = teamTotal(values.inningsB);
    nextPayload.hitsA = toNonNegative(values.hitsA);
    nextPayload.hitsB = toNonNegative(values.hitsB);
    nextPayload.errorsA = toNonNegative(values.errorsA);
    nextPayload.errorsB = toNonNegative(values.errorsB);
    nextPayload.leftOnBaseA = toNonNegative(values.leftOnBaseA);
    nextPayload.leftOnBaseB = toNonNegative(values.leftOnBaseB);

    const teamAId = match.teamAId ?? '';
    const teamBId = match.teamBId ?? '';
    const playerLines = [
      ...values.playersA.map((p) => ({
        teamId: teamAId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: p,
      })),
      ...values.playersB.map((p) => ({
        teamId: teamBId,
        studentId: p.studentId,
        playerName: p.playerName,
        stats: p,
      })),
    ];

    setFinalizing(true);
    try {
      await onFinalize({ payloadJson: nextPayload, playerLines });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-10">
        <div className="space-y-4 lg:col-span-3">
          <ScoreSummaryCard
            teamAName={match.teamAName ?? 'Team A'}
            teamBName={match.teamBName ?? 'Team B'}
            totalA={totalA}
            totalB={totalB}
            winnerText={winnerText}
          />

          <InningGrid
            form={form}
            readOnly={readOnly}
            activeInningCell={activeInningCell}
            setActiveInningCell={setActiveInningCell}
            inningRefs={inningRefs}
            moveInningFocus={moveInningFocus}
          />
        </div>

        <div className="lg:col-span-7">
          <PlayerStatsTable
            form={form}
            playerColumns={playerColumns}
            readOnly={readOnly}
            roster={roster}
            activePlayerRow={activePlayerRow}
            setActivePlayerRow={setActivePlayerRow}
            playerRefs={playerRefs}
          />
        </div>
      </div>

      {computedPreview && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Result summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Summary A:</strong> {(computedPreview as { summaryA?: string }).summaryA ?? ''}</p>
            <p><strong>Summary B:</strong> {(computedPreview as { summaryB?: string }).summaryB ?? ''}</p>
            <p><strong>Winner:</strong> {(computedPreview as { winnerTeamId?: string }).winnerTeamId ? winnerText : 'Tie / TBD'}</p>
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleSaveDraft()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button variant="secondary" onClick={() => void handleSaveDraft()} disabled={saving}>
            Auto Calculate Winner
          </Button>
          {canFinalize && (
            <Button onClick={() => void handleFinalize()} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Finalize'}
            </Button>
          )}
        </div>
      )}

      {readOnly && <p className="text-sm text-muted-foreground">This scorecard is finalized and cannot be edited.</p>}
    </div>
  );
}

function ScoreSummaryCard({
  teamAName,
  teamBName,
  totalA,
  totalB,
  winnerText,
}: {
  teamAName: string;
  teamBName: string;
  totalA: number;
  totalB: number;
  winnerText: string;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Match Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
          <span className="font-medium">{teamAName}</span>
          <span className="text-lg font-semibold text-blue-600">{totalA}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
          <span className="font-medium">{teamBName}</span>
          <span className="text-lg font-semibold text-blue-600">{totalB}</span>
        </div>
        <div className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          {winnerText}
        </div>
      </CardContent>
    </Card>
  );
}

function InningGrid({
  form,
  readOnly,
  activeInningCell,
  setActiveInningCell,
  inningRefs,
  moveInningFocus,
}: {
  form: UseFormReturn<BaseballFormValues>;
  readOnly: boolean;
  activeInningCell: string | null;
  setActiveInningCell: (v: string | null) => void;
  inningRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  moveInningFocus: (team: 'A' | 'B', inningIdx: number) => void;
}) {
  const inningsA = form.watch('inningsA');
  const inningsB = form.watch('inningsB');
  const sumA = teamTotal(inningsA ?? []);
  const sumB = teamTotal(inningsB ?? []);

  const navInning = (team: 'A' | 'B', inningIdx: number, key: string) => {
    if (key === 'ArrowRight') moveInningFocus(team, Math.min(11, inningIdx + 1));
    if (key === 'ArrowLeft') moveInningFocus(team, Math.max(0, inningIdx - 1));
    if (key === 'ArrowDown') moveInningFocus(team === 'A' ? 'B' : 'A', inningIdx);
    if (key === 'ArrowUp') moveInningFocus(team === 'B' ? 'A' : 'B', inningIdx);
    if (key === 'Enter') moveInningFocus(team === 'A' ? 'B' : 'A', inningIdx);
  };

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Innings Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border px-2 py-1 text-left">Team</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="border px-2 py-1 text-center">{i + 1}</th>
                ))}
                <th className="border px-2 py-1 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B'] as const).map((team) => (
                <tr key={team}>
                  <td className="border px-2 py-1 font-medium">{team === 'A' ? 'Team A' : 'Team B'}</td>
                  {Array.from({ length: 12 }, (_, inningIdx) => {
                    const fieldName = team === 'A' ? (`inningsA.${inningIdx}` as const) : (`inningsB.${inningIdx}` as const);
                    const cellKey = `${team}-${inningIdx}`;
                    return (
                      <td key={inningIdx} className="border p-1">
                        <Input
                          type="number"
                          min={0}
                          disabled={readOnly}
                          className={`h-8 w-14 text-center ${activeInningCell === cellKey ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                          {...form.register(fieldName, { valueAsNumber: true })}
                          onFocus={() => setActiveInningCell(cellKey)}
                          onBlur={() => setActiveInningCell(null)}
                          onKeyDown={(e) => {
                            if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                              navInning(team, inningIdx, e.key);
                            }
                          }}
                          ref={(el) => {
                            form.register(fieldName).ref(el);
                            inningRefs.current[cellKey] = el;
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="border px-2 py-1 text-center font-semibold text-blue-700">{team === 'A' ? sumA : sumB}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border p-2">R: {sumA} - {sumB}</div>
          <div className="rounded border p-2">H: {form.watch('hitsA')} - {form.watch('hitsB')}</div>
          <div className="rounded border p-2">E: {form.watch('errorsA')} - {form.watch('errorsB')}</div>
          <div className="rounded border p-2">LOB: {form.watch('leftOnBaseA')} - {form.watch('leftOnBaseB')}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumberStepper({
  path,
  form,
  readOnly,
  inputRefKey,
  playerRefs,
  onFocusRow,
  rowId,
  className,
  min = 0,
}: {
  path: Path<BaseballFormValues>;
  form: UseFormReturn<BaseballFormValues>;
  readOnly: boolean;
  inputRefKey: string;
  playerRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onFocusRow: (rowId: string) => void;
  rowId: string;
  className?: string;
  min?: number;
}) {
  const value = form.watch(path) as number | undefined;
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-7 px-0"
        disabled={readOnly}
        onClick={() => form.setValue(path, Math.max(min, toNonNegative(value) - 1), { shouldDirty: true })}
      >
        -
      </Button>
      <Input
        type="number"
        min={min}
        disabled={readOnly}
        className="h-8 w-14 text-center"
        {...form.register(path, { valueAsNumber: true })}
        onFocus={() => onFocusRow(rowId)}
        ref={(el) => {
          form.register(path).ref(el);
          playerRefs.current[inputRefKey] = el;
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-7 px-0"
        disabled={readOnly}
        onClick={() => form.setValue(path, toNonNegative(value) + 1, { shouldDirty: true })}
      >
        +
      </Button>
    </div>
  );
}

function PlayerStatsTable({
  form,
  playerColumns,
  readOnly,
  roster,
  activePlayerRow,
  setActivePlayerRow,
  playerRefs,
}: {
  form: UseFormReturn<BaseballFormValues>;
  playerColumns: PlayerColumnDef[];
  readOnly: boolean;
  roster: { teamA: RosterMember[]; teamB: RosterMember[] };
  activePlayerRow: string | null;
  setActivePlayerRow: (v: string | null) => void;
  playerRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const playersA = form.watch('playersA');
  const playersB = form.watch('playersB');

  const renderRow = (team: 'A' | 'B', rowIndex: number, row: PlayerRow) => {
    const rowId = `${team}-${rowIndex}`;
    return (
      <tr key={row.studentId} className={activePlayerRow === rowId ? 'bg-blue-50/60' : ''}>
        <td className="sticky left-0 z-10 border bg-white px-2 py-1 font-medium">{row.playerName}</td>
        {playerColumns.map((col, colIdx) => {
          const path = `${team === 'A' ? 'playersA' : 'playersB'}.${rowIndex}.${col.key}` as Path<BaseballFormValues>;
          const refKey = `${team}-${rowIndex}-${colIdx}`;
          if (col.type === 'text') {
            return (
              <td key={col.key} className="border p-1">
                <Input
                  type="text"
                  disabled={readOnly}
                  className="h-8 min-w-[6rem]"
                  {...form.register(path)}
                  onFocus={() => setActivePlayerRow(rowId)}
                  onBlur={() => setActivePlayerRow(null)}
                  ref={(el) => {
                    form.register(path).ref(el);
                    playerRefs.current[refKey] = el;
                  }}
                />
              </td>
            );
          }
          return (
            <td key={col.key} className="border p-1">
              <NumberStepper
                path={path}
                form={form}
                readOnly={readOnly}
                inputRefKey={refKey}
                playerRefs={playerRefs}
                onFocusRow={setActivePlayerRow}
                rowId={rowId}
              />
            </td>
          );
        })}
      </tr>
    );
  };

  const total = (rows: PlayerRow[], key: keyof PlayerRow) =>
    rows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? toNonNegative(row[key]) : 0), 0);

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Player Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="teamA">Team A</TabsTrigger>
            <TabsTrigger value="teamB">Team B</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-3">
            <div className="hidden md:block max-h-[68vh] overflow-auto rounded border">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-30 border bg-slate-50 px-2 py-1 text-left">Player</th>
                    {playerColumns.map((c) => (
                      <th key={c.key} className="border px-2 py-1 text-left">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playersA?.map((row, idx) => renderRow('A', idx, row))}
                  {playersB?.map((row, idx) => renderRow('B', idx, row))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="sticky left-0 z-10 border bg-slate-50 px-2 py-1">Totals</td>
                    {playerColumns.map((c) => (
                      <td key={c.key} className="border px-2 py-1">
                        {c.type === 'number' ? total([...(playersA ?? []), ...(playersB ?? [])], c.key as keyof PlayerRow) : '-'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {[...(playersA ?? []), ...(playersB ?? [])].map((row, idx) => (
                <Card key={row.studentId}>
                  <CardContent className="space-y-2 pt-4">
                    <p className="font-medium">{row.playerName}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {playerColumns.slice(0, 6).map((c) => (
                        <div key={`${row.studentId}-${c.key}`} className="text-xs">
                          <p className="text-muted-foreground">{c.label}</p>
                          <p className="font-medium">{String((row as Record<string, unknown>)[c.key] ?? '')}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="teamA" className="text-sm text-muted-foreground mt-3">Use the All tab to edit full roster quickly.</TabsContent>
          <TabsContent value="teamB" className="text-sm text-muted-foreground mt-3">Use the All tab to edit full roster quickly.</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


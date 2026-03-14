'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPut, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useMemo, useEffect } from 'react';
import { ScorecardRenderer } from '@/components/scorecards/ScorecardRenderer';

/** Per-player score in scorecardJson (matches API schema) */
type PlayerScoreEntry = {
  studentId: string;
  displayValue?: string;
  numericValue?: number;
};

type ScorecardJsonWithPlayers = {
  teamA?: { players: PlayerScoreEntry[] };
  teamB?: { players: PlayerScoreEntry[] };
};

type TeamMember = {
  student: { id: string; fullName: string; admissionNo: string };
};

type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  status: string;
  teamAId?: string;
  teamBId?: string;
  teamA?: {
    id: string;
    name: string;
    coachName?: string | null;
    members?: TeamMember[];
  };
  teamB?: {
    id: string;
    name: string;
    coachName?: string | null;
    members?: TeamMember[];
  };
  category?: {
    id: string;
    name: string;
    format?: string;
    competitionSport?: {
      sport?: {
        scoringModel: 'SIMPLE_POINTS' | 'SETS' | 'TIME_DISTANCE' | 'CRICKET_LITE';
        matchConfigJson?: Record<string, unknown> | null;
      };
    };
  };
  scorecard?: {
    scoringModel: string;
    summaryA: string;
    summaryB: string;
    numericScoreA?: number | null;
    numericScoreB?: number | null;
    scorecardJson: unknown;
  };
  result?: { winnerTeamId: string; method: string; winnerTeam?: { name: string } };
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function isScorecardWithPlayers(json: unknown): json is ScorecardJsonWithPlayers {
  if (!json || typeof json !== 'object') return false;
  const o = json as Record<string, unknown>;
  if (o.teamA != null && typeof o.teamA === 'object' && !Array.isArray((o.teamA as { players?: unknown }).players)) return false;
  if (o.teamB != null && typeof o.teamB === 'object' && !Array.isArray((o.teamB as { players?: unknown }).players)) return false;
  return true;
}

const WORKFLOW_STEPS = 'Workflow: Enter scores → Set winner → Winner advances to next round';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [finalizeWinner, setFinalizeWinner] = useState<string | null>(null);
  const [summaryA, setSummaryA] = useState('');
  const [summaryB, setSummaryB] = useState('');
  const [modelJson, setModelJson] = useState<Record<string, unknown>>({});
  const [derivedNumeric, setDerivedNumeric] = useState<{ numericScoreA?: number; numericScoreB?: number }>({});

  const { data: match, isLoading } = useQuery({
    queryKey: [tenantId, 'matches', matchId],
    queryFn: async () => assertOk(await apiGet<Match>(`/tenants/${tenantId}/matches/${matchId}`)),
    enabled: !!tenantId && !!matchId,
  });

  const putScorecard = useMutation({
    mutationFn: async (body: {
      scoringModel: string;
      scorecardJson: object;
      summaryA: string;
      summaryB: string;
      numericScoreA?: number;
      numericScoreB?: number;
    }) => assertOk(await apiPut(`/tenants/${tenantId}/matches/${matchId}/scorecard`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'matches', matchId] });
    },
  });

  const finalize = useMutation({
    mutationFn: async (body: { winnerTeamId: string; method: string }) =>
      assertOk(await apiPost(`/tenants/${tenantId}/matches/${matchId}/finalize`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'matches', matchId] });
      setFinalizeWinner(null);
    },
  });

  const scorecardJson = match?.scorecard?.scorecardJson;
  const existingPlayers = useMemo(() => {
    if (!isScorecardWithPlayers(scorecardJson)) return { teamA: {} as Record<string, { displayValue: string; numericValue: string }>, teamB: {} as Record<string, { displayValue: string; numericValue: string }> };
    const teamA: Record<string, { displayValue: string; numericValue: string }> = {};
    const teamB: Record<string, { displayValue: string; numericValue: string }> = {};
    scorecardJson.teamA?.players?.forEach((p) => {
      teamA[p.studentId] = {
        displayValue: p.displayValue ?? '',
        numericValue: p.numericValue != null ? String(p.numericValue) : '',
      };
    });
    scorecardJson.teamB?.players?.forEach((p) => {
      teamB[p.studentId] = {
        displayValue: p.displayValue ?? '',
        numericValue: p.numericValue != null ? String(p.numericValue) : '',
      };
    });
    return { teamA, teamB };
  }, [scorecardJson]);

  const [playerScores, setPlayerScores] = useState<{
    teamA: Record<string, { displayValue: string; numericValue: string }>;
    teamB: Record<string, { displayValue: string; numericValue: string }>;
  }>({ teamA: {}, teamB: {} });

  const mergedPlayerScores = useMemo(() => ({
    teamA: { ...existingPlayers.teamA, ...playerScores.teamA },
    teamB: { ...existingPlayers.teamB, ...playerScores.teamB },
  }), [existingPlayers, playerScores]);

  const setPlayerScore = (
    side: 'teamA' | 'teamB',
    studentId: string,
    field: 'displayValue' | 'numericValue',
    value: string
  ) => {
    setPlayerScores((prev) => {
      const current = prev[side][studentId] ?? mergedPlayerScores[side][studentId] ?? { displayValue: '', numericValue: '' };
      return {
        ...prev,
        [side]: {
          ...prev[side],
          [studentId]: { ...current, [field]: value },
        },
      };
    });
  };

  useEffect(() => {
    if (match?.scorecard) {
      setSummaryA(match.scorecard.summaryA ?? '');
      setSummaryB(match.scorecard.summaryB ?? '');
      if (match.scorecard.scorecardJson && typeof match.scorecard.scorecardJson === 'object') {
        setModelJson(match.scorecard.scorecardJson as Record<string, unknown>);
      }
      setDerivedNumeric({
        numericScoreA: match.scorecard.numericScoreA ?? undefined,
        numericScoreB: match.scorecard.numericScoreB ?? undefined,
      });
    }
  }, [match?.id, match?.scorecard?.summaryA, match?.scorecard?.summaryB, match?.scorecard?.scorecardJson, match?.scorecard?.numericScoreA, match?.scorecard?.numericScoreB]);

  if (!tenantId) return <p>Loading...</p>;
  if (isLoading || !match) return <p>Loading match...</p>;

  const isBye = !match.teamAId || !match.teamBId;
  const canFinalize = match.status !== 'COMPLETED' && match.teamAId && match.teamBId;
  const membersA = match.teamA?.members ?? [];
  const membersB = match.teamB?.members ?? [];
  const scoringModel = match.category?.competitionSport?.sport?.scoringModel ?? (match.scorecard?.scoringModel as 'SIMPLE_POINTS' | 'SETS' | 'TIME_DISTANCE' | 'CRICKET_LITE' | undefined) ?? 'SIMPLE_POINTS';
  const matchConfigJson = match.category?.competitionSport?.sport?.matchConfigJson ?? {};

  const buildScorecardJson = (): Record<string, unknown> => {
    const teamAPlayers: PlayerScoreEntry[] = membersA.map((m) => {
      const s = mergedPlayerScores.teamA[m.student.id] ?? {};
      const num = s.numericValue?.trim() ? parseFloat(s.numericValue) : undefined;
      return {
        studentId: m.student.id,
        displayValue: s.displayValue?.trim() || undefined,
        numericValue: num,
      };
    });
    const teamBPlayers: PlayerScoreEntry[] = membersB.map((m) => {
      const s = mergedPlayerScores.teamB[m.student.id] ?? {};
      const num = s.numericValue?.trim() ? parseFloat(s.numericValue) : undefined;
      return {
        studentId: m.student.id,
        displayValue: s.displayValue?.trim() || undefined,
        numericValue: num,
      };
    });
    return {
      ...(modelJson ?? {}),
      ...(teamAPlayers.length ? { teamA: { players: teamAPlayers } } : {}),
      ...(teamBPlayers.length ? { teamB: { players: teamBPlayers } } : {}),
    };
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/competitions" className="text-sm text-muted-foreground hover:underline">← Competitions</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {match.teamA?.name ?? 'TBD'} vs {match.teamB?.name ?? 'TBD'}
      </h1>
      <p className="text-muted-foreground mb-4">
        Round {match.roundNumber} · Match {match.matchNumber} · {match.status}
      </p>

      <p className="text-xs text-muted-foreground mb-4 border-l-2 border-muted pl-2">{WORKFLOW_STEPS}</p>

      {match.result && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">Winner: {match.result.winnerTeam?.name ?? match.result.winnerTeamId}</p>
            <p className="text-sm text-muted-foreground">Method: {match.result.method}</p>
          </CardContent>
        </Card>
      )}

      {!match.result && match.status !== 'COMPLETED' && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Scorecard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  putScorecard.mutate({
                    scoringModel,
                    scorecardJson: buildScorecardJson(),
                    summaryA,
                    summaryB,
                    numericScoreA: derivedNumeric.numericScoreA,
                    numericScoreB: derivedNumeric.numericScoreB,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Summary A ({match.teamA?.name})</Label>
                  <Input value={summaryA} onChange={(e) => setSummaryA(e.target.value)} />
                </div>
                <div>
                  <Label>Summary B ({match.teamB?.name})</Label>
                  <Input value={summaryB} onChange={(e) => setSummaryB(e.target.value)} />
                </div>

                <div className="pt-2 border-t space-y-2">
                  <h3 className="font-medium">Model scorecard ({scoringModel})</h3>
                  <ScorecardRenderer
                    scoringModel={scoringModel}
                    matchConfigJson={matchConfigJson}
                    teamAName={match.teamA?.name ?? 'Team A'}
                    teamBName={match.teamB?.name ?? 'Team B'}
                    scorecardJson={modelJson}
                    onChange={(nextJson, derived) => {
                      setModelJson(nextJson);
                      setDerivedNumeric({
                        numericScoreA: derived?.numericScoreA,
                        numericScoreB: derived?.numericScoreB,
                      });
                      if (derived?.summaryA != null) setSummaryA(derived.summaryA);
                      if (derived?.summaryB != null) setSummaryB(derived.summaryB);
                    }}
                  />
                </div>

                {(membersA.length > 0 || membersB.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                    {membersA.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Per-player scores — {match.teamA?.name}</h3>
                        <ul className="space-y-2">
                          {membersA.map(({ student }) => (
                            <li key={student.id} className="flex flex-wrap items-center gap-2">
                              <span className="text-sm w-32 truncate" title={student.fullName}>
                                {student.fullName}
                              </span>
                              <span className="text-xs text-muted-foreground">({student.admissionNo})</span>
                              <Input
                                type="text"
                                placeholder="Display"
                                className="w-24 h-8"
                                value={mergedPlayerScores.teamA[student.id]?.displayValue ?? ''}
                                onChange={(e) => setPlayerScore('teamA', student.id, 'displayValue', e.target.value)}
                              />
                              <Input
                                type="number"
                                placeholder="Number"
                                className="w-20 h-8"
                                value={mergedPlayerScores.teamA[student.id]?.numericValue ?? ''}
                                onChange={(e) => setPlayerScore('teamA', student.id, 'numericValue', e.target.value)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {membersB.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Per-player scores — {match.teamB?.name}</h3>
                        <ul className="space-y-2">
                          {membersB.map(({ student }) => (
                            <li key={student.id} className="flex flex-wrap items-center gap-2">
                              <span className="text-sm w-32 truncate" title={student.fullName}>
                                {student.fullName}
                              </span>
                              <span className="text-xs text-muted-foreground">({student.admissionNo})</span>
                              <Input
                                type="text"
                                placeholder="Display"
                                className="w-24 h-8"
                                value={mergedPlayerScores.teamB[student.id]?.displayValue ?? ''}
                                onChange={(e) => setPlayerScore('teamB', student.id, 'displayValue', e.target.value)}
                              />
                              <Input
                                type="number"
                                placeholder="Number"
                                className="w-20 h-8"
                                value={mergedPlayerScores.teamB[student.id]?.numericValue ?? ''}
                                onChange={(e) => setPlayerScore('teamB', student.id, 'numericValue', e.target.value)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={putScorecard.isPending}>Save scorecard</Button>
              </form>
            </CardContent>
          </Card>

          {canFinalize && (
            <Card>
              <CardHeader>
                <CardTitle>Finalize match</CardTitle>
              </CardHeader>
              <CardContent>
                {!finalizeWinner ? (
                  <div className="flex gap-2">
                    {match.teamAId && (
                      <Button onClick={() => setFinalizeWinner(match.teamAId!)}>
                        {match.teamA?.name} wins
                      </Button>
                    )}
                    {match.teamBId && (
                      <Button onClick={() => setFinalizeWinner(match.teamBId!)}>
                        {match.teamB?.name} wins
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Confirm winner: {match.teamAId === finalizeWinner ? match.teamA?.name : match.teamB?.name}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => finalize.mutate({ winnerTeamId: finalizeWinner, method: 'NORMAL' })} disabled={finalize.isPending}>
                        Confirm
                      </Button>
                      <Button variant="outline" onClick={() => setFinalizeWinner(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

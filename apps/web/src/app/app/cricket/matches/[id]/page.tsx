'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { apiGet, apiPut, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Student = { id: string; fullName: string; admissionNo: string };
type TeamMember = { student: Student };
type Team = {
  id: string;
  name: string;
  members?: TeamMember[];
};
type CricketInnings = {
  id: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  fours: number;
  sixes: number;
  completed: boolean;
  target: number | null;
  battingTeam: Team;
  bowlingTeam: Team;
};
type CricketMatch = {
  id: string;
  status: string;
  winnerTeamId: string | null;
  resultType: string;
  notes: string | null;
  ballsPerOver: number;
  teamA: Team;
  teamB: Team;
  innings: CricketInnings[];
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const inningsSchema = z
  .object({
    runs: z.number().int().min(0),
    wickets: z.number().int().min(0).max(10),
    overs: z.number().int().min(0),
    balls: z.number().int().min(0).max(5),
    wides: z.number().int().min(0),
    noBalls: z.number().int().min(0),
    byes: z.number().int().min(0),
    legByes: z.number().int().min(0),
    fours: z.number().int().min(0),
    sixes: z.number().int().min(0),
    completed: z.boolean(),
    target: z.number().int().min(0).optional(),
  })
  .refine((d) => d.runs >= d.wides + d.noBalls + d.byes + d.legByes, {
    message: 'Runs must be at least total extras',
    path: ['runs'],
  });

type InningsFormData = z.infer<typeof inningsSchema>;

const FINALIZED_STATUSES = ['COMPLETED', 'TBD', 'NO_RESULT', 'ABANDONED'];

export default function CricketMatchDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const role = (session?.user as { role?: string })?.role;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'1' | '2' | 'result'>('1');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: match, isLoading } = useQuery({
    queryKey: [tenantId, 'cricket', 'matches', id],
    queryFn: async () =>
      assertOk(await apiGet<CricketMatch>(`/tenants/${tenantId}/cricket/matches/${id}`)),
    enabled: !!tenantId && !!id,
  });

  const putInnings = useMutation({
    mutationFn: async ({
      inningsNumber,
      body,
    }: {
      inningsNumber: 1 | 2;
      body: {
        runs: number;
        wickets: number;
        overs: number;
        balls: number;
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        fours: number;
        sixes: number;
        completed: boolean;
        target?: number;
      };
    }) =>
      assertOk(
        await apiPut(`/tenants/${tenantId}/cricket/matches/${id}/innings/${inningsNumber}`, body)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'cricket', 'matches', id] });
      setSubmitError(null);
    },
  });

  const finalize = useMutation({
    mutationFn: async (body: { status: string; reason?: string }) =>
      assertOk(await apiPost(`/tenants/${tenantId}/cricket/matches/${id}/finalize`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'cricket', 'matches', id] });
      setSubmitError(null);
    },
  });

  const isLocked = match && FINALIZED_STATUSES.includes(match.status) && role !== 'PLATFORM_ADMIN';

  if (!tenantId) return <p>Loading session...</p>;
  if (isLoading || !match) return <p>Loading match...</p>;

  const innings1 = match.innings.find((i) => i.inningsNumber === 1);
  const innings2 = match.innings.find((i) => i.inningsNumber === 2);
  const ballsPerOver = match.ballsPerOver || 6;

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/cricket/matches" className="text-sm text-muted-foreground hover:underline">
          ← Cricket scorecards
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {match.teamA.name} vs {match.teamB.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        Status: {match.status}
        {match.winnerTeamId && (
          <> · Winner: {match.teamA.id === match.winnerTeamId ? match.teamA.name : match.teamB.name}</>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{match.teamA.name} – Players</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {match.teamA.members?.length ? (
              <ul className="text-sm space-y-1 list-disc list-inside">
                {match.teamA.members.map((m) => (
                  <li key={m.student.id}>
                    {m.student.fullName}
                    {m.student.admissionNo && (
                      <span className="text-muted-foreground"> ({m.student.admissionNo})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No players added to this team.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{match.teamB.name} – Players</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {match.teamB.members?.length ? (
              <ul className="text-sm space-y-1 list-disc list-inside">
                {match.teamB.members.map((m) => (
                  <li key={m.student.id}>
                    {m.student.fullName}
                    {m.student.admissionNo && (
                      <span className="text-muted-foreground"> ({m.student.admissionNo})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No players added to this team.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b mb-4">
        <Button
          variant={activeTab === '1' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('1')}
        >
          Innings 1
        </Button>
        <Button
          variant={activeTab === '2' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('2')}
        >
          Innings 2
        </Button>
        <Button
          variant={activeTab === 'result' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('result')}
        >
          Result
        </Button>
      </div>

      {activeTab === '1' && innings1 && (
        <InningsForm
          innings={innings1}
          ballsPerOver={ballsPerOver}
          isLocked={!!isLocked}
          submitError={submitError}
          onClearError={() => setSubmitError(null)}
          onSubmit={async (data) => {
            const r = await apiPut(`/tenants/${tenantId}/cricket/matches/${id}/innings/1`, {
              runs: data.runs,
              wickets: data.wickets,
              overs: data.overs,
              balls: data.balls,
              wides: data.wides,
              noBalls: data.noBalls,
              byes: data.byes,
              legByes: data.legByes,
              fours: data.fours,
              sixes: data.sixes,
              completed: data.completed,
            });
            if (!r.ok) {
              setSubmitError(r.error.message);
              return;
            }
            queryClient.invalidateQueries({ queryKey: [tenantId, 'cricket', 'matches', id] });
          }}
        />
      )}

      {activeTab === '2' && innings2 && innings1 && (
        <InningsForm
          innings={innings2}
          ballsPerOver={ballsPerOver}
          defaultTarget={innings1.runs + 1}
          isLocked={!!isLocked}
          submitError={submitError}
          onClearError={() => setSubmitError(null)}
          onSubmit={async (data) => {
            const r = await apiPut(`/tenants/${tenantId}/cricket/matches/${id}/innings/2`, {
              runs: data.runs,
              wickets: data.wickets,
              overs: data.overs,
              balls: data.balls,
              wides: data.wides,
              noBalls: data.noBalls,
              byes: data.byes,
              legByes: data.legByes,
              fours: data.fours,
              sixes: data.sixes,
              completed: data.completed,
              target: data.target,
            });
            if (!r.ok) {
              setSubmitError(r.error.message);
              return;
            }
            queryClient.invalidateQueries({ queryKey: [tenantId, 'cricket', 'matches', id] });
          }}
        />
      )}

      {activeTab === 'result' && (
        <ResultTab
          match={match}
          innings1={innings1}
          innings2={innings2}
          ballsPerOver={ballsPerOver}
          isLocked={!!isLocked}
          submitError={submitError}
          onClearError={() => setSubmitError(null)}
          onFinalize={async (body) => {
            const r = await apiPost(`/tenants/${tenantId}/cricket/matches/${id}/finalize`, body);
            if (!r.ok) {
              setSubmitError(r.error.message);
              return;
            }
            queryClient.invalidateQueries({ queryKey: [tenantId, 'cricket', 'matches', id] });
          }}
        />
      )}
    </div>
  );
}

function InningsForm({
  innings,
  ballsPerOver,
  defaultTarget,
  isLocked,
  submitError,
  onClearError,
  onSubmit,
}: {
  innings: CricketInnings;
  ballsPerOver: number;
  defaultTarget?: number;
  isLocked: boolean;
  submitError: string | null;
  onClearError: () => void;
  onSubmit: (data: InningsFormData) => Promise<void>;
}) {
  const overs = Math.floor(innings.legalBalls / ballsPerOver);
  const balls = innings.legalBalls % ballsPerOver;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<InningsFormData>({
    resolver: zodResolver(inningsSchema),
    defaultValues: {
      runs: innings.runs,
      wickets: innings.wickets,
      overs,
      balls,
      wides: innings.wides,
      noBalls: innings.noBalls,
      byes: innings.byes,
      legByes: innings.legByes,
      fours: innings.fours,
      sixes: innings.sixes,
      completed: innings.completed,
      target: innings.target ?? defaultTarget,
    },
  });

  const extras = watch('wides') + watch('noBalls') + watch('byes') + watch('legByes');
  const runRate =
    (watch('overs') * ballsPerOver + watch('balls')) > 0
      ? (watch('runs') / ((watch('overs') * ballsPerOver + watch('balls')) / ballsPerOver)).toFixed(2)
      : '0.00';

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {innings.battingTeam.name} vs {innings.bowlingTeam.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLocked && (
          <p className="text-sm text-muted-foreground mb-4">Match finalized. Editing is locked.</p>
        )}
        <form
          onSubmit={handleSubmit(async (data) => {
            onClearError();
            await onSubmit(data);
          })}
          className="space-y-4"
        >
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Runs</Label>
              <Input type="number" {...register('runs', { valueAsNumber: true })} disabled={isLocked} />
              {errors.runs && <p className="text-sm text-destructive">{errors.runs.message}</p>}
            </div>
            <div>
              <Label>Wickets</Label>
              <Input type="number" {...register('wickets', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>Overs</Label>
              <Input type="number" {...register('overs', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>Balls (0–5)</Label>
              <Input type="number" {...register('balls', { valueAsNumber: true })} disabled={isLocked} />
              {errors.balls && <p className="text-sm text-destructive">{errors.balls.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Wides</Label>
              <Input type="number" {...register('wides', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>No-balls</Label>
              <Input type="number" {...register('noBalls', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>Byes</Label>
              <Input type="number" {...register('byes', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>Leg-byes</Label>
              <Input type="number" {...register('legByes', { valueAsNumber: true })} disabled={isLocked} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>4s</Label>
              <Input type="number" {...register('fours', { valueAsNumber: true })} disabled={isLocked} />
            </div>
            <div>
              <Label>6s</Label>
              <Input type="number" {...register('sixes', { valueAsNumber: true })} disabled={isLocked} />
            </div>
          </div>
          {defaultTarget != null && (
            <div>
              <Label>Target (optional override)</Label>
              <Input type="number" {...register('target', { valueAsNumber: true })} disabled={isLocked} />
              <p className="text-xs text-muted-foreground">Default: {defaultTarget}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('completed')} disabled={isLocked} id="completed" />
            <Label htmlFor="completed">Innings completed</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Extras: {extras} · Run rate: {runRate}
          </p>
          {!isLocked && <Button type="submit">Save innings</Button>}
        </form>
      </CardContent>
    </Card>
  );
}

function ResultTab({
  match,
  innings1,
  innings2,
  ballsPerOver,
  isLocked,
  submitError,
  onClearError,
  onFinalize,
}: {
  match: CricketMatch;
  innings1?: CricketInnings;
  innings2?: CricketInnings;
  ballsPerOver: number;
  isLocked: boolean;
  submitError: string | null;
  onClearError: () => void;
  onFinalize: (body: { status: string; reason?: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState(match.status);
  const [reason, setReason] = useState('');
  const alreadyFinalized = FINALIZED_STATUSES.includes(match.status);

  const formatOvers = (legalBalls: number) => {
    const o = Math.floor(legalBalls / ballsPerOver);
    const b = legalBalls % ballsPerOver;
    return `${o}.${b}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {innings1 && innings2 && (
          <div className="text-sm space-y-1">
            <p>
              <strong>{innings1.battingTeam.name}</strong> {innings1.runs}/{innings1.wickets} in{' '}
              {formatOvers(innings1.legalBalls)} ({innings1.fours}×4, {innings1.sixes}×6)
            </p>
            <p>
              <strong>{innings2.battingTeam.name}</strong> {innings2.runs}/{innings2.wickets} in{' '}
              {formatOvers(innings2.legalBalls)} ({innings2.fours}×4, {innings2.sixes}×6)
              {innings2.target != null && ` · Target ${innings2.target}`}
            </p>
          </div>
        )}
        {match.notes && <p className="text-sm text-muted-foreground">{match.notes}</p>}
        {alreadyFinalized && (
          <p className="text-sm text-muted-foreground">Match is finalized. Status: {match.status}</p>
        )}
        {!alreadyFinalized && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              onClearError();
              if (status !== 'COMPLETED' && !reason.trim()) {
                return;
              }
              await onFinalize({ status, reason: reason.trim() || undefined });
            }}
            className="space-y-4"
          >
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="TBD">TBD</SelectItem>
                  <SelectItem value="NO_RESULT">No result</SelectItem>
                  <SelectItem value="ABANDONED">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status !== 'COMPLETED' && (
              <div>
                <Label>Reason (required)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for TBD / No result / Abandoned"
                />
              </div>
            )}
            <Button type="submit">Finalize</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

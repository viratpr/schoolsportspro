'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Category = {
  id: string;
  name: string;
  gender: string;
  format: string;
  competitionSport: { sport: { name: string; scoringModel?: string } };
  stats?: { totalTeams: number; totalMatches: number; completedMatches: number; championTeamId?: string };
};
type Team = { id: string; name: string; coachName?: string; _count?: { members: number } };
type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  status: string;
  teamA?: { id: string; name: string };
  teamB?: { id: string; name: string };
  result?: { winnerTeamId: string; method: string };
};
type MatchesRes = { data: Match[]; byRound: Record<number, Match[]> };

type ParsedTeamLine = {
  original: string;
  name: string;
  coachName?: string;
};

type BulkTeamsInput = {
  teams: ParsedTeamLine[];
};

type BulkTeamsResultItem = ParsedTeamLine & {
  status: 'created' | 'skipped' | 'error';
  message?: string;
};

type BulkTeamsResult = {
  items: BulkTeamsResultItem[];
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function parseTeamsInput(raw: string): ParsedTeamLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Support "Team - Coach", "Team — Coach", or comma-separated "Team, Coach"
      const dashSplit = line.split(/[-–—]/);
      const commaSplit = line.split(',');

      let name = line;
      let coachName: string | undefined;

      if (dashSplit.length >= 2) {
        name = dashSplit[0].trim();
        coachName = dashSplit.slice(1).join('-').trim() || undefined;
      } else if (commaSplit.length >= 2) {
        name = commaSplit[0].trim();
        coachName = commaSplit.slice(1).join(',').trim() || undefined;
      }

      return {
        original: line,
        name,
        coachName,
      };
    })
    .filter((t) => t.name.length > 0);
}

export default function CategoryDetailPage() {
  const params = useParams();
  const competitionSportId = params.competitionSportId as string;
  const categoryId = params.categoryId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () =>
      assertOk(await apiGet<Category>(`/tenants/${tenantId}/competition-sports/${competitionSportId}/categories/${categoryId}`)),
    enabled: !!tenantId && !!competitionSportId && !!categoryId,
  });

  const { data: teamsData } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'teams'],
    queryFn: async () => assertOk(await apiGet<{ data: Team[] }>(`/tenants/${tenantId}/categories/${categoryId}/teams`)),
    enabled: !!tenantId && !!categoryId,
  });

  const { data: matchesData } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'matches'],
    queryFn: async () => assertOk(await apiGet<MatchesRes>(`/tenants/${tenantId}/categories/${categoryId}/matches`)),
    enabled: !!tenantId && !!categoryId,
  });

  const generateBracket = useMutation({
    mutationFn: async () => assertOk(await apiPost(`/tenants/${tenantId}/categories/${categoryId}/bracket/generate`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    },
  });

  const bulkCreateTeams = useMutation({
    mutationFn: async (input: BulkTeamsInput): Promise<BulkTeamsResult> => {
      const items: BulkTeamsResultItem[] = [];
      for (const t of input.teams) {
        const res = await apiPost<Team>(`/tenants/${tenantId}/categories/${categoryId}/teams`, {
          name: t.name,
          coachName: t.coachName,
        });
        if (!res.ok) {
          const status = res.error.statusCode === 409 ? 'skipped' : 'error';
          items.push({
            ...t,
            status,
            message: res.error.message,
          });
        } else {
          items.push({
            ...t,
            status: 'created',
          });
        }
      }
      return { items };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'teams'] });
    },
  });

  const [showMultiInput, setShowMultiInput] = useState(false);
  const [rawTeamsInput, setRawTeamsInput] = useState('');

  const parsedTeams = useMemo(() => parseTeamsInput(rawTeamsInput), [rawTeamsInput]);

  const isTeam = category?.format === 'KNOCKOUT';
  const isIndividual = category?.format === 'INDIVIDUAL';

  if (!tenantId) return <p>Loading...</p>;
  if (catLoading && !category) return <p>Loading category...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href={`/app/competition-sports/${competitionSportId}/categories`} className="text-sm text-muted-foreground hover:underline">← Categories</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">{category?.name ?? 'Category'}</h1>
      <p className="text-muted-foreground mb-4">{category?.format} · {category?.gender}</p>

      {category?.competitionSport?.sport?.scoringModel === 'CRICKET_LITE' && (
        <p className="mb-4">
          <Link href={`/app/cricket/matches?categoryId=${categoryId}`} className="text-primary underline">
            Cricket scorecards →
          </Link>
        </p>
      )}

      {isTeam && (
        <>
          <p className="text-xs text-muted-foreground mb-4 border-l-2 border-muted pl-2">
            Step 1: Add teams (single or multiple) → Step 2: Generate knockout bracket → Step 3: Use the fight table / schedule to play and record matches
          </p>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{teamsData?.data?.length ?? 0} teams</p>
                <Button variant="outline" size="sm" onClick={() => setShowMultiInput((v) => !v)}>
                  {showMultiInput ? 'Hide multiple teams' : 'Add multiple teams'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamsData?.data?.map((t) => (
                <Link
                  key={t.id}
                  href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/teams/${t.id}`}
                  className="flex justify-between items-center hover:bg-muted rounded-md px-2 py-1 transition-colors"
                >
                  <span>{t.name}{t.coachName ? ` (${t.coachName})` : ''}</span>
                  {typeof t._count?.members === 'number' && (
                    <span className="text-xs text-muted-foreground">
                      {t._count.members} member{t._count.members === 1 ? '' : 's'}
                    </span>
                  )}
                </Link>
              ))}
              {showMultiInput && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste or type one team per line. You can optionally add a coach name after a dash or comma.
                    <br />
                    Examples: &quot;Blue House&quot;, &quot;Red House - Coach Mehta&quot;, &quot;Green House, Coach Singh&quot;.
                  </p>
                  <textarea
                    className="w-full min-h-[120px] text-sm border rounded-md px-2 py-1 bg-background"
                    value={rawTeamsInput}
                    onChange={(e) => setRawTeamsInput(e.target.value)}
                    placeholder="Team A&#10;Team B - Coach Name&#10;Team C, Coach Name"
                  />
                  {parsedTeams.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Preview ({parsedTeams.length} teams to create):
                      </p>
                      <div className="border rounded-md divide-y">
                        {parsedTeams.map((t) => (
                          <div key={t.original} className="flex items-center justify-between px-2 py-1 text-sm">
                            <span>{t.name}</span>
                            <span className="text-muted-foreground">
                              {t.coachName ? t.coachName : 'No coach'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => bulkCreateTeams.mutate({ teams: parsedTeams })}
                        disabled={bulkCreateTeams.isPending || parsedTeams.length === 0}
                      >
                        {bulkCreateTeams.isPending ? 'Creating teams...' : 'Create teams'}
                      </Button>
                      {bulkCreateTeams.data && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            Created:{' '}
                            {bulkCreateTeams.data.items.filter((i) => i.status === 'created').length}
                            {' · '}
                            Skipped (duplicates):{' '}
                            {bulkCreateTeams.data.items.filter((i) => i.status === 'skipped').length}
                            {' · '}
                            Errors:{' '}
                            {bulkCreateTeams.data.items.filter((i) => i.status === 'error').length}
                          </p>
                          {bulkCreateTeams.data.items.some((i) => i.status === 'error') && (
                            <ul className="list-disc pl-4">
                              {bulkCreateTeams.data.items
                                .filter((i) => i.status === 'error')
                                .map((i) => (
                                  <li key={i.original}>
                                    {i.original}: {i.message}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="mb-4">
            <Button
              onClick={() => generateBracket.mutate()}
              disabled={generateBracket.isPending || (teamsData?.data?.length ?? 0) < 2}
            >
              Generate knockout bracket
            </Button>
          </div>
          <h2 className="text-lg font-semibold mb-1">Fight table / Matches by round</h2>
          <p className="text-xs text-muted-foreground mb-2">
            This is the fight table / schedule generated from your bracket. Click a match to record scores and finalize results.
          </p>
          {matchesData?.data?.length ? (
            Object.entries(matchesData.byRound ?? {}).map(([round, matches]) => (
              <div key={round} className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Round {round}</p>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-2 flex-wrap">
                        <Link href={`/app/matches/${m.id}`} className="flex-1 min-w-0">
                          <span>
                            {m.teamA?.name ?? 'TBD'} vs {m.teamB?.name ?? 'TBD'}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">{m.status}</span>
                        </Link>
                        <Link href={`/app/matches/${m.id}/scorecard`}>
                          <Button variant="outline" size="sm">Scorecard</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Generate bracket to create matches.</p>
          )}
        </>
      )}

      {isIndividual && (
        <Card>
          <CardHeader>
            <CardTitle>Individual category</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/participants`}>
              <Button variant="outline" className="mr-2">Participants</Button>
            </Link>
            <Link href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/leaderboard`}>
              <Button variant="outline">Leaderboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

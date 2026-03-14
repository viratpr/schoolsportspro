'use client';

import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Competition = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  gender: string;
  format: string;
  competitionSport: { sport: { name: string; scoringModel?: string } };
};
type Team = { id: string; name: string; coachName?: string; _count?: { members: number } };
type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  status: string;
  teamA?: { id: string; name: string };
  teamB?: { id: string; name: string };
};
type MatchesRes = { data: Match[]; byRound: Record<number, Match[]> };
type CompetitionSport = { id: string; sport: { name: string; sportType: string; scoringModel?: string } };
type CategoriesRes = { data: Category[] };
type ParsedTeamLine = { original: string; name: string; coachName?: string };
type BulkTeamsResultItem = ParsedTeamLine & { status: 'created' | 'skipped' | 'error'; message?: string };
type BulkTeamsResult = { items: BulkTeamsResultItem[] };

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
      return { original: line, name, coachName };
    })
    .filter((t) => t.name.length > 0);
}

export default function SportSingleWindowPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const competitionId = params.competitionId as string;
  const competitionSportId = params.competitionSportId as string;
  const categoryIdFromUrl = searchParams.get('categoryId');
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [showMultiInput, setShowMultiInput] = useState(false);
  const [rawTeamsInput, setRawTeamsInput] = useState('');

  const { data: competition } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId],
    queryFn: async () => assertOk(await apiGet<Competition>(`/tenants/${tenantId}/competitions/${competitionId}`)),
    enabled: !!tenantId && !!competitionId,
  });

  const { data: competitionSport } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId],
    queryFn: async () =>
      assertOk(await apiGet<CompetitionSport>(`/tenants/${tenantId}/competition-sports/${competitionSportId}`)),
    enabled: !!tenantId && !!competitionSportId,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId, 'categories'],
    queryFn: async () =>
      assertOk(await apiGet<CategoriesRes>(`/tenants/${tenantId}/competition-sports/${competitionSportId}/categories`)),
    enabled: !!tenantId && !!competitionSportId,
  });

  const categories = categoriesData?.data ?? [];
  const selectedCategoryId =
    categoryIdFromUrl && categories.some((c) => c.id === categoryIdFromUrl)
      ? categoryIdFromUrl
      : categories[0]?.id ?? null;

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['category', selectedCategoryId],
    queryFn: async () =>
      assertOk(
        await apiGet<Category>(
          `/tenants/${tenantId}/competition-sports/${competitionSportId}/categories/${selectedCategoryId}`
        )
      ),
    enabled: !!tenantId && !!competitionSportId && !!selectedCategoryId,
  });

  const { data: teamsData } = useQuery({
    queryKey: [tenantId, 'categories', selectedCategoryId, 'teams'],
    queryFn: async () =>
      assertOk(await apiGet<{ data: Team[] }>(`/tenants/${tenantId}/categories/${selectedCategoryId}/teams`)),
    enabled: !!tenantId && !!selectedCategoryId,
  });

  const { data: matchesData } = useQuery({
    queryKey: [tenantId, 'categories', selectedCategoryId, 'matches'],
    queryFn: async () =>
      assertOk(await apiGet<MatchesRes>(`/tenants/${tenantId}/categories/${selectedCategoryId}/matches`)),
    enabled: !!tenantId && !!selectedCategoryId,
  });

  const generateBracket = useMutation({
    mutationFn: async () =>
      assertOk(await apiPost(`/tenants/${tenantId}/categories/${selectedCategoryId}/bracket/generate`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', selectedCategoryId, 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['category', selectedCategoryId] });
    },
  });

  const bulkCreateTeams = useMutation({
    mutationFn: async (input: { teams: ParsedTeamLine[] }): Promise<BulkTeamsResult> => {
      const items: BulkTeamsResultItem[] = [];
      for (const t of input.teams) {
        const res = await apiPost<Team>(`/tenants/${tenantId}/categories/${selectedCategoryId}/teams`, {
          name: t.name,
          coachName: t.coachName,
        });
        if (!res.ok) {
          items.push({
            ...t,
            status: res.error.statusCode === 409 ? 'skipped' : 'error',
            message: res.error.message,
          });
        } else {
          items.push({ ...t, status: 'created' });
        }
      }
      return { items };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', selectedCategoryId, 'teams'] });
    },
  });

  const parsedTeams = useMemo(() => parseTeamsInput(rawTeamsInput), [rawTeamsInput]);
  const isTeam = category?.format === 'KNOCKOUT';
  const isIndividual = category?.format === 'INDIVIDUAL';

  if (!tenantId) return <p>Loading...</p>;
  if (!competition || !competitionSport) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/app/competitions" className="hover:underline">Competitions</Link>
        <span>/</span>
        <Link href={`/app/competitions/${competitionId}`} className="hover:underline">
          {competition.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{competitionSport.sport.name}</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{competitionSport.sport.name}</h1>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground mb-4">No categories yet. Add categories to manage teams and matches.</p>
            <Link href={`/app/competition-sports/${competitionSportId}/categories`}>
              <Button>Add categories</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/app/competitions/${competitionId}/sport/${competitionSportId}?categoryId=${c.id}`}
                >
                  <Button
                    variant={selectedCategoryId === c.id ? 'default' : 'outline'}
                    size="sm"
                  >
                    {c.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {!selectedCategoryId ? null : catLoading && !category ? (
            <p>Loading category...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">{category?.name}</h2>
                <p className="text-muted-foreground text-sm mb-4">{category?.format} · {category?.gender}</p>
              </div>

              {category?.competitionSport?.sport?.scoringModel === 'CRICKET_LITE' && (
                <p>
                  <Link href={`/app/cricket/matches?categoryId=${selectedCategoryId}`} className="text-primary underline">
                    Cricket scorecards →
                  </Link>
                </p>
              )}

              {isTeam && (
                <>
                  <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
                    Step 1: Add teams → Step 2: Generate bracket → Step 3: Play matches and record scores
                  </p>
                  <Card>
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
                          href={`/app/competition-sports/${competitionSportId}/categories/${selectedCategoryId}/teams/${t.id}`}
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
                            One team per line. Optional coach after dash or comma.
                          </p>
                          <textarea
                            className="w-full min-h-[100px] text-sm border rounded-md px-2 py-1 bg-background"
                            value={rawTeamsInput}
                            onChange={(e) => setRawTeamsInput(e.target.value)}
                            placeholder="Team A&#10;Team B - Coach Name"
                          />
                          {parsedTeams.length > 0 && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => bulkCreateTeams.mutate({ teams: parsedTeams })}
                                disabled={bulkCreateTeams.isPending}
                              >
                                {bulkCreateTeams.isPending ? 'Creating...' : `Create ${parsedTeams.length} teams`}
                              </Button>
                              {bulkCreateTeams.data && (
                                <p className="text-xs text-muted-foreground">
                                  Created: {bulkCreateTeams.data.items.filter((i) => i.status === 'created').length}
                                  {' · '}Skipped: {bulkCreateTeams.data.items.filter((i) => i.status === 'skipped').length}
                                  {bulkCreateTeams.data.items.some((i) => i.status === 'error') && (
                                    <> · Errors: {bulkCreateTeams.data.items.filter((i) => i.status === 'error').length}</>
                                  )}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div>
                    <Button
                      onClick={() => generateBracket.mutate()}
                      disabled={generateBracket.isPending || (teamsData?.data?.length ?? 0) < 2}
                    >
                      Generate knockout bracket
                    </Button>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold mb-2">Matches</h2>
                    <p className="text-xs text-muted-foreground mb-2">
                      Click a match to view details or open scorecard to enter scores.
                    </p>
                    {matchesData?.data?.length ? (
                      <div className="space-y-3">
                        {Object.entries(matchesData.byRound ?? {}).map(([round, matches]) => (
                          <div key={round}>
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
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Generate bracket to create matches.</p>
                    )}
                  </div>
                </>
              )}

              {isIndividual && (
                <Card>
                  <CardHeader>
                    <CardTitle>Individual category</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Link href={`/app/competition-sports/${competitionSportId}/categories/${selectedCategoryId}/participants`}>
                      <Button variant="outline">Participants</Button>
                    </Link>
                    <Link href={`/app/competition-sports/${competitionSportId}/categories/${selectedCategoryId}/leaderboard`}>
                      <Button variant="outline">Leaderboard</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

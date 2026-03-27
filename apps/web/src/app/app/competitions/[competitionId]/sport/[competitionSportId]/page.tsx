'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTeamsSection } from '@/components/app/CategoryTeamsSection';
import { getSportSymbol } from '@/lib/sport-symbols';

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
type CompetitionSport = {
  id: string;
  sport: { name: string; sportType: string; scoringModel?: string };
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  coordinatorEmail?: string | null;
};
type CategoriesRes = { data: Category[] };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
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
        <span className="text-foreground font-medium">{getSportSymbol(competitionSport.sport.name)} {competitionSport.sport.name}</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{getSportSymbol(competitionSport.sport.name)} {competitionSport.sport.name}</h1>

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
                  {selectedCategoryId && (
                    <CategoryTeamsSection
                      tenantId={tenantId}
                      categoryId={selectedCategoryId}
                      competitionSportId={competitionSportId}
                      teams={teamsData?.data}
                    />
                  )}

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

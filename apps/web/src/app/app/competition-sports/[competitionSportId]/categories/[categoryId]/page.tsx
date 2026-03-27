'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTeamsSection } from '@/components/app/CategoryTeamsSection';

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

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
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
          <div className="mb-4">
            <CategoryTeamsSection
              tenantId={tenantId}
              categoryId={categoryId}
              competitionSportId={competitionSportId}
              teams={teamsData?.data}
            />
          </div>
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

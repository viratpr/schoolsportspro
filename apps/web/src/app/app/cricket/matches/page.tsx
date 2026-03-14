'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Competition = { id: string; name: string; academicYear: string };
type Category = { id: string; name: string };
type Team = { id: string; name: string };
type CricketInnings = {
  id: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  battingTeam: Team;
  bowlingTeam: Team;
};
type CricketMatch = {
  id: string;
  status: string;
  winnerTeamId: string | null;
  resultType: string;
  notes: string | null;
  teamA: Team;
  teamB: Team;
  competition: Competition;
  category: Category;
  innings: CricketInnings[];
};

type CompetitionsRes = { data: Competition[]; nextCursor: string | null };
type CricketMatchesRes = { data: CricketMatch[] };

const ALL_FILTER = '__all__';

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function CricketMatchesPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [competitionId, setCompetitionId] = useState<string>(() => searchParams.get('competitionId') ?? ALL_FILTER);
  const [categoryId, setCategoryId] = useState<string>(() => searchParams.get('categoryId') ?? ALL_FILTER);

  useEffect(() => {
    const comp = searchParams.get('competitionId');
    const cat = searchParams.get('categoryId');
    if (comp != null) setCompetitionId(comp);
    if (cat != null) setCategoryId(cat);
  }, [searchParams]);

  const { data: comps } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions'],
    queryFn: async () => assertOk(await apiGet<CompetitionsRes>(`/tenants/${tenantId}/competitions`)),
    enabled: !!tenantId,
  });

  const { data: sports } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: { id: string; sportId: string; sport: { scoringModel: string } }[] }>(
          `/tenants/${tenantId}/competitions/${competitionId}/sports`
        )
      ),
    enabled: !!tenantId && !!competitionId && competitionId !== ALL_FILTER,
  });

  const cricketSportId = sports?.data?.find((s) => s.sport.scoringModel === 'CRICKET_LITE')?.id;

  const { data: categories } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', cricketSportId, 'categories'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: Category[] }>(
          `/tenants/${tenantId}/competition-sports/${cricketSportId}/categories`
        )
      ),
    enabled: !!tenantId && !!cricketSportId,
  });

  const params = new URLSearchParams();
  if (competitionId && competitionId !== ALL_FILTER) params.set('competitionId', competitionId);
  if (categoryId && categoryId !== ALL_FILTER) params.set('categoryId', categoryId);
  const queryString = params.toString();

  const { data: matchesData, isLoading, isError, error } = useQuery({
    queryKey: ['tenants', tenantId, 'cricket', 'matches', competitionId, categoryId],
    queryFn: async () =>
      assertOk(
        await apiGet<CricketMatchesRes>(
          `/tenants/${tenantId}/cricket/matches${queryString ? `?${queryString}` : ''}`
        )
      ),
    enabled: !!tenantId,
  });

  if (!tenantId) return <p>Loading session...</p>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Cricket scorecards</h1>
        <Link href="/app/cricket/matches/new">
          <Button>New cricket match</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Label>Competition</Label>
          <Select value={competitionId} onValueChange={(v) => { setCompetitionId(v); setCategoryId(ALL_FILTER); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All</SelectItem>
              {comps?.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={!cricketSportId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All</SelectItem>
              {categories?.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p>Loading matches...</p>}
      {isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm">
          <p className="font-medium text-destructive">
            {error instanceof Error ? error.message : 'Failed to load cricket matches'}
          </p>
        </div>
      )}
      {!isLoading && !isError && matchesData?.data && matchesData.data.length > 0 && (
        <div className="space-y-2">
          {matchesData.data.map((m) => (
            <Card key={m.id}>
              <CardContent className="py-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">
                    {m.teamA.name} vs {m.teamB.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.competition.name} · {m.category.name} · {m.status}
                    {m.winnerTeamId && (
                      <> · {m.teamA.id === m.winnerTeamId ? m.teamA.name : m.teamB.name} won</>
                    )}
                  </p>
                </div>
                <Link href={`/app/cricket/matches/${m.id}`}>
                  <Button variant="outline">Open</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && !isError && (!matchesData?.data || matchesData.data.length === 0) && (
        <p className="text-muted-foreground">
          No cricket matches yet.{' '}
          <Link href="/app/cricket/matches/new" className="text-primary underline">
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}

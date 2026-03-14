'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function getFlowSummary(sportType: string): string {
  if (sportType === 'TEAM') return 'Category → Teams → Bracket → Matches';
  return 'Category → Participants → Results';
}

type Sport = {
  id: string;
  name: string;
  sportType: string;
  scoringModel: string;
  defaultRulesText: string;
  createdAt: string;
};
type ListRes = { data: Sport[]; nextCursor: string | null };

export default function PlatformSportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'sports'],
    queryFn: async () => assertOk(await apiGet<ListRes>('/platform/sports')),
  });

  if (isLoading) return <p>Loading...</p>;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Global Sports Library</h1>
        <Link href="/platform/sports/new">
          <Button>Create sport</Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Platform admins manage the global sports library here; schools enable sports when creating a competition.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.data?.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.sportType} · {s.scoringModel}</p>
                <p className="text-xs text-muted-foreground mt-1">Flow: {getFlowSummary(s.sportType)}</p>
              </div>
              <Link href={`/platform/sports/${s.id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm line-clamp-3">{s.defaultRulesText}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

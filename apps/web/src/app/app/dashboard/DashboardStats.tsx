'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardSummary = {
  studentsCount: number;
  competitionsCount: number;
  categoriesCount: number;
  participantsCount: number;
  matchesTotal: number;
  matchesCompleted: number;
  publicCompetitionsCount: number;
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export function DashboardStats({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary', tenantId],
    queryFn: async () => assertOk(await apiGet<DashboardSummary>(`/tenants/${tenantId}/dashboard-summary`)),
    enabled: !!tenantId,
  });

  if (!tenantId) return null;
  if (isLoading && !data) {
    return <p className="mb-4 text-sm text-muted-foreground">Loading stats…</p>;
  }
  if (isError) {
    return <p className="mb-4 text-sm text-destructive">Could not load dashboard stats.</p>;
  }
  if (!data) return null;

  const completionPct =
    data.matchesTotal > 0 ? Math.round((data.matchesCompleted / data.matchesTotal) * 100) : 0;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Students</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.studentsCount}</p>
          <p className="text-xs text-muted-foreground">Active in master data</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Competitions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.competitionsCount}</p>
          <p className="text-xs text-muted-foreground">This tenant</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Matches completed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {data.matchesCompleted}/{data.matchesTotal}
          </p>
          <p className="text-xs text-muted-foreground">
            {completionPct}% of scheduled matches
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Public live view</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.publicCompetitionsCount}</p>
          <p className="text-xs text-muted-foreground">Competitions with public link</p>
        </CardContent>
      </Card>
    </div>
  );
}


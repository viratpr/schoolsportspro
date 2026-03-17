'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type ChartData = {
  participantsByCompetition: { competitionId: string; competitionName: string; academicYear: string; count: number }[];
  participantsBySport: { sportId: string; sportName: string; count: number }[];
  matchesByCompetition: { competitionId: string; competitionName: string; academicYear: string; total: number; completed: number }[];
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const emptyMessage = 'Create competitions and add participants to see charts.';

export function DashboardCharts({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-chart-data', tenantId],
    queryFn: async () => assertOk(await apiGet<ChartData>(`/tenants/${tenantId}/dashboard-chart-data`)),
    enabled: !!tenantId,
  });

  if (!tenantId) return null;
  if (isLoading && !data) {
    return <p className="mb-4 text-sm text-muted-foreground">Loading charts…</p>;
  }
  if (isError) {
    return <p className="mb-4 text-sm text-destructive">Could not load chart data.</p>;
  }
  if (!data) return null;

  const hasParticipantsByComp = data.participantsByCompetition.length > 0;
  const hasParticipantsBySport = data.participantsBySport.length > 0;
  const hasMatchesByComp = data.matchesByCompetition.length > 0;
  const hasAnyChart = hasParticipantsByComp || hasParticipantsBySport || hasMatchesByComp;

  if (!hasAnyChart) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  const barColor = 'hsl(var(--primary))';
  const lineColor = 'hsl(var(--chart-2, var(--primary)))';

  return (
    <div className="mb-6 grid gap-6 md:grid-cols-2">
      {hasParticipantsByComp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants by competition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.participantsByCompetition.map((d) => ({ name: d.competitionName.length > 12 ? d.competitionName.slice(0, 12) + '…' : d.competitionName, fullName: d.competitionName, count: d.count }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [value ?? 0, 'Participants']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="count" fill={barColor} name="Participants" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {hasParticipantsBySport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participation by sport (sports played)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.participantsBySport.map((d) => ({ name: d.sportName.length > 10 ? d.sportName.slice(0, 10) + '…' : d.sportName, fullName: d.sportName, count: d.count }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [value ?? 0, 'Participants']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar dataKey="count" fill={barColor} name="Participants" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMatchesByComp && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Matches completed by competition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.matchesByCompetition.map((d) => ({
                    name: d.competitionName.length > 14 ? d.competitionName.slice(0, 14) + '…' : d.competitionName,
                    fullName: d.competitionName,
                    completed: d.completed,
                    total: d.total,
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any, name: string | undefined) => [value ?? 0, name === 'completed' ? 'Completed' : 'Total']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Legend formatter={(value) => (value === 'completed' ? 'Completed' : 'Total')} />
                  <Line type="monotone" dataKey="completed" stroke={lineColor} strokeWidth={2} dot={{ r: 4 }} name="completed" />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} name="total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

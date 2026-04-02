'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type InventorySummary = {
  usable: number;
  onLoan: number;
  damaged: number;
  byCategory: { category: string; available: number; onLoan: number }[];
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export function InventoryDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenants', tenantId, 'inventory', 'summary'],
    queryFn: async () => assertOk(await apiGet<InventorySummary>(`/tenants/${tenantId}/inventory/summary`)),
    enabled: !!tenantId,
  });

  if (!tenantId) return null;
  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load inventory summary.</p>;
  }

  const chartData = data.byCategory.map((row) => ({
    name: row.category.length > 14 ? `${row.category.slice(0, 14)}…` : row.category,
    fullName: row.category,
    Available: row.available,
    'On loan': row.onLoan,
  }));
  const hasChart = chartData.length > 0;

  const barAvail = 'hsl(var(--chart-1, var(--primary)))';
  const barLoan = 'hsl(var(--chart-2, 220 14% 46%))';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usable stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{data.usable}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total units not marked damaged (includes items on loan)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On loan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{data.onLoan}</p>
            <p className="mt-1 text-xs text-muted-foreground">Issued for games / PT periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Damaged / repair</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{data.damaged}</p>
            <p className="mt-1 text-xs text-muted-foreground">Unusable until repaired or replaced</p>
          </CardContent>
        </Card>
      </div>

      {hasChart ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock by category</CardTitle>
            <p className="text-sm text-muted-foreground">Available vs on loan</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const full = payload[0]?.payload?.fullName ?? label;
                      return (
                        <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                          <p className="font-medium">{full}</p>
                          {payload.map((p) => (
                            <p key={String(p.dataKey)} className="text-muted-foreground">
                              {p.name}: <span className="font-medium text-foreground">{p.value}</span>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Available" stackId="s" fill={barAvail} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="On loan" stackId="s" fill={barLoan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Add items in the master register to see category breakdown.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

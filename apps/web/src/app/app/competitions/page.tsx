'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Competition = {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  venue?: string;
  status: string;
  createdAt: string;
};
type ListRes = { data: Competition[]; nextCursor: string | null };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function CompetitionsPage() {
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions'],
    queryFn: async () => assertOk(await apiGet<ListRes>(`/tenants/${tenantId}/competitions`)),
    enabled: !!tenantId,
    retry: 1,
  });

  if (!tenantId) return <p>Loading session...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Competitions</h1>
        <Link href="/app/competitions/new">
          <Button>New competition</Button>
        </Link>
      </div>
      {isLoading && <p>Loading...</p>}
      {isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm">
          <p className="font-medium text-destructive">{error instanceof Error ? error.message : 'Failed to load competitions'}</p>
          {error instanceof Error && error.message.includes('API running') && (
            <p className="mt-2 text-muted-foreground">Start the API with: <code className="bg-muted px-1 rounded">pnpm --filter @bharatathlete/api dev</code></p>
          )}
        </div>
      )}
      {!isLoading && !isError && data?.data && data.data.length > 0 && (
        <div className="space-y-2">
          {data.data.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.academicYear} · {c.status}</p>
                </div>
                <Link href={`/app/competitions/${c.id}`}>
                  <Button variant="outline">Open</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) && (
        <p className="text-muted-foreground">No competitions yet. <Link href="/app/competitions/new" className="text-primary underline">Create one</Link> to get started.</p>
      )}
    </div>
  );
}

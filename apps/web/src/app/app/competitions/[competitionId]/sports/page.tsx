'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Sport = { id: string; name: string; sportType: string; scoringModel: string };
type ListRes = { data: Sport[]; nextCursor: string | null };
type CompetitionSport = { id: string; sportId: string; enabled: boolean; sport: Sport };
type Entitlements = { sportsEnabledLimit: number; canUseAllSports: boolean; isTrial: boolean; trialEndsAt: string | null; isProActive: boolean };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function CompetitionSportsPage() {
  const params = useParams();
  const competitionId = params.competitionId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [limitError, setLimitError] = useState<string | null>(null);

  const { data: entitlements } = useQuery({
    queryKey: ['tenants', tenantId, 'entitlements'],
    queryFn: async () => assertOk(await apiGet<Entitlements>(`/tenants/${tenantId}/entitlements`)),
    enabled: !!tenantId,
  });

  const { data: compSports } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'],
    queryFn: async () => assertOk(await apiGet<{ data: CompetitionSport[] }>(`/tenants/${tenantId}/competitions/${competitionId}/sports`)),
    enabled: !!tenantId && !!competitionId,
  });

  const { data: allSports } = useQuery({
    queryKey: ['sports', 'library'],
    queryFn: async () => assertOk(await apiGet<ListRes>('/sports')),
    enabled: !!tenantId,
  });

  const queryClient = useQueryClient();
  const addSport = useMutation({
    mutationFn: async (sportId: string) => {
      const r = await apiPost(`/tenants/${tenantId}/competitions/${competitionId}/sports`, { sportId, enabled: true });
      if (!r.ok && r.error.statusCode === 402) throw new ApiClientError(r.error.message, 402, r.error.code);
      return assertOk(r);
    },
    onSuccess: () => {
      setLimitError(null);
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'] });
    },
    onError: (err: ApiClientError) => {
      if (err.statusCode === 402) setLimitError(err.message || 'Upgrade to Pro to enable more sports.');
    },
  });

  const enabledList = compSports?.data?.filter((s) => s.enabled) ?? [];
  const enabledIds = new Set(enabledList.map((s) => s.sportId));
  const atLimit = !entitlements?.canUseAllSports && enabledList.length >= (entitlements?.sportsEnabledLimit ?? 2);

  if (!tenantId) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <Link href={`/app/competitions/${competitionId}`} className="text-sm text-muted-foreground hover:underline">← Competition</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-muted">
            {entitlements?.isProActive ? 'Pro' : 'Trial'}
          </span>
          {!entitlements?.canUseAllSports && (
            <span className="text-sm text-muted-foreground">
              Enabled {enabledList.length} of {entitlements?.sportsEnabledLimit} allowed
            </span>
          )}
          <Link href="/app/billing">
            <Button variant="outline" size="sm">Billing</Button>
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Enable sports from library</h1>
      {limitError && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between flex-wrap gap-2">
          <span>{limitError}</span>
          <Link href="/app/billing"><Button size="sm">Upgrade to Pro</Button></Link>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {allSports?.data?.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-4 flex items-center justify-between">
              <span>{s.name} ({s.sportType})</span>
              {enabledIds.has(s.id) ? (
                <Link href={`/app/competitions/${competitionId}/sport/${compSports?.data?.find((cs) => cs.sportId === s.id)?.id}`}>
                  <Button variant="outline" size="sm">Open</Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  onClick={() => addSport.mutate(s.id)}
                  disabled={addSport.isPending || atLimit}
                >
                  Enable
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

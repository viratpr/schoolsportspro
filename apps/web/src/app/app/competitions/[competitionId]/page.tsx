'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Competition = {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  venue?: string;
  status: string;
  shareToken?: string | null;
};
type CompetitionSport = {
  id: string;
  sportId: string;
  enabled: boolean;
  sport: { id: string; name: string; sportType: string };
};
type Category = { id: string; name: string; gender: string; format: string };
type CategoriesRes = { data: Category[] };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function CompetitionDashboardPage() {
  const params = useParams();
  const competitionId = params.competitionId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId],
    queryFn: async () => assertOk(await apiGet<Competition>(`/tenants/${tenantId}/competitions/${competitionId}`)),
    enabled: !!tenantId && !!competitionId,
  });

  const { data: sportsData } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'],
    queryFn: async () => assertOk(await apiGet<{ data: CompetitionSport[] }>(`/tenants/${tenantId}/competitions/${competitionId}/sports`)),
    enabled: !!tenantId && !!competitionId,
  });

  const enabledSports = sportsData?.data?.filter((s) => s.enabled) ?? [];
  const categoriesQueries = useQueries({
    queries: enabledSports.map((cs) => ({
      queryKey: ['tenants', tenantId, 'competition-sports', cs.id, 'categories'],
      queryFn: async () =>
        assertOk(
          await apiGet<CategoriesRes>(`/tenants/${tenantId}/competition-sports/${cs.id}/categories`)
        ),
      enabled: !!tenantId && !!cs.id,
    })),
  });
  const categoriesBySportId = Object.fromEntries(
    enabledSports.map((cs, i) => [
      cs.id,
      categoriesQueries[i]?.data?.data ?? [],
    ])
  );

  const enablePublicView = useMutation({
    mutationFn: async () =>
      assertOk(
        await apiPost<{ shareToken: string; publicUrl: string }>(
          `/tenants/${tenantId}/competitions/${competitionId}/enable-public-view`,
          {}
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions', competitionId] });
    },
  });

  const disablePublicView = useMutation({
    mutationFn: async () =>
      assertOk(
        await apiPost(`/tenants/${tenantId}/competitions/${competitionId}/disable-public-view`, {})
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions', competitionId] });
    },
  });

  const publicUrl =
    (enablePublicView.data?.publicUrl as string | undefined) ??
    (competition?.shareToken
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/live/${competition.shareToken}`
      : '');

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tenantId) return <p>Loading...</p>;
  if (compLoading || !competition) return <p>Loading competition...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/competitions" className="text-sm text-muted-foreground hover:underline">← Competitions</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">{competition.name}</h1>
      <p className="text-muted-foreground mb-4">{competition.academicYear} · {competition.status}</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Public live view</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share a link with students and parents so they can see live scores, rankings, and fixtures without logging in.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {competition.shareToken || enablePublicView.data ? (
            <>
              <div className="flex gap-2 flex-wrap">
                <Input
                  readOnly
                  value={publicUrl}
                  className="flex-1 min-w-0 font-mono text-sm"
                />
                <Button variant="outline" onClick={copyLink} disabled={!publicUrl}>
                  {copied ? 'Copied!' : 'Copy link'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => disablePublicView.mutate()}
                  disabled={disablePublicView.isPending}
                >
                  {disablePublicView.isPending ? 'Disabling…' : 'Disable public link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view scores and leaderboards. Disable to turn off access.
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={() => enablePublicView.mutate()}
                disabled={enablePublicView.isPending}
              >
                {enablePublicView.isPending ? 'Enabling…' : 'Enable public link'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Generate a shareable link for this competition. Students and parents can open it on their phone to see live scores and rankings.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-4">
        <Link href={`/app/competitions/${competitionId}/sports`}>
          <Button>Manage sports & categories</Button>
        </Link>
      </div>
      <h2 className="text-lg font-semibold mb-2">Sports & categories</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {enabledSports.map((cs) => {
          const categories = categoriesBySportId[cs.id] ?? [];
          return (
            <Card key={cs.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium">{cs.sport.name}</span>
                  <Link href={`/app/competitions/${competitionId}/sport/${cs.id}`}>
                    <Button size="sm">Open</Button>
                  </Link>
                </div>
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No categories yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {enabledSports.length === 0 && (
          <p className="text-muted-foreground text-sm">No sports enabled yet. Add from library.</p>
        )}
      </div>
    </div>
  );
}

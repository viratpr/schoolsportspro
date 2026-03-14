'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPut, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicScorecardForm } from '@/components/scorecard/DynamicScorecardForm';

type TemplateScorecardResponse = {
  match: {
    id: string;
    teamAId: string | null;
    teamBId: string | null;
    teamAName: string | null;
    teamBName: string | null;
    status: string;
  };
  template: Record<string, unknown>;
  templateVersion: number;
  matchScorecard: {
    id: string;
    status: string;
    payloadJson: Record<string, unknown>;
    computedJson: Record<string, unknown> | null;
    summaryA: string;
    summaryB: string;
    winnerTeamId: string | null;
  } | null;
  roster: {
    teamA: { studentId: string; fullName: string; admissionNo: string }[];
    teamB: { studentId: string; fullName: string; admissionNo: string }[];
  };
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function TemplateScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [tenantId, 'matches', matchId, 'template-scorecard'],
    queryFn: async () => assertOk(await apiGet<TemplateScorecardResponse>(`/tenants/${tenantId}/matches/${matchId}/template-scorecard`)),
    enabled: !!tenantId && !!matchId,
    retry: false,
  });

  const saveDraft = useMutation({
    mutationFn: async (body: { payloadJson: Record<string, unknown>; playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[] }) => {
      const r = await apiPut<{ scorecard: unknown; computed: Record<string, unknown> }>(
        `/tenants/${tenantId}/matches/${matchId}/template-scorecard`,
        body
      );
      return assertOk(r);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'matches', matchId, 'template-scorecard'] });
    },
  });

  const finalize = useMutation({
    mutationFn: async (body: { payloadJson: Record<string, unknown>; playerLines: { teamId: string; studentId?: string | null; playerName?: string | null; stats: Record<string, unknown> }[] }) => {
      return assertOk(
        await apiPost(`/tenants/${tenantId}/matches/${matchId}/template-scorecard/finalize`, body)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'matches', matchId, 'template-scorecard'] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'matches', matchId] });
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories'] });
    },
  });

  const canFinalize = (session?.user as { role?: string })?.role === 'COORDINATOR' || (session?.user as { role?: string })?.role === 'SCHOOL_ADMIN';

  if (!tenantId) return <p className="p-4">Loading session...</p>;
  if (isLoading) return <p className="p-4">Loading scorecard...</p>;
  if (error || !data) {
    const msg = error instanceof ApiClientError && error.statusCode === 404
      ? 'Template scorecard is not available for this match. Use the match page to enter scores.'
      : (error instanceof Error ? error.message : 'Failed to load scorecard');
    return (
      <div className="p-4 space-y-2">
        <p className="text-muted-foreground">{msg}</p>
        <Link href={`/app/matches/${matchId}`}>
          <Button variant="outline">Open match page</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/app/matches/${matchId}`} className="text-sm text-muted-foreground hover:underline">
            ← Back to match
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            Scorecard — {(data.template as { displayName?: string }).displayName ?? 'Match'}
          </h1>
        </div>
      </div>

      <DynamicScorecardForm
        template={data.template as Parameters<typeof DynamicScorecardForm>[0]['template']}
        templateVersion={data.templateVersion}
        match={data.match}
        matchScorecard={data.matchScorecard}
        roster={data.roster}
        tenantId={tenantId}
        matchId={matchId}
        onSaveDraft={async (body) => saveDraft.mutateAsync(body)}
        onFinalize={async (body) => finalize.mutateAsync(body)}
        canFinalize={canFinalize}
      />
    </div>
  );
}

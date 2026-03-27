'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Sport = { id: string; name: string; sportType: string; scoringModel: string };
type ListRes = { data: Sport[]; nextCursor: string | null };
type CompetitionSport = {
  id: string;
  sportId: string;
  enabled: boolean;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  coordinatorEmail?: string | null;
  sport: Sport;
};
type Entitlements = {
  sportsEnabledLimit: number;
  canUseAllSports: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  isProActive: boolean;
};

type CoordinatorDraft = { name: string; phone: string; email: string };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const emptyDraft = (): CoordinatorDraft => ({ name: '', phone: '', email: '' });

export default function CompetitionSportsPage() {
  const params = useParams();
  const competitionId = params.competitionId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [limitError, setLimitError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoordinatorDraft>(emptyDraft);
  const [enableTarget, setEnableTarget] = useState<{ sportId: string; sportName: string } | null>(null);
  const [editTarget, setEditTarget] = useState<CompetitionSport | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data: entitlements } = useQuery({
    queryKey: ['tenants', tenantId, 'entitlements'],
    queryFn: async () => assertOk(await apiGet<Entitlements>(`/tenants/${tenantId}/entitlements`)),
    enabled: !!tenantId,
  });

  const { data: compSports } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'],
    queryFn: async () =>
      assertOk(await apiGet<{ data: CompetitionSport[] }>(`/tenants/${tenantId}/competitions/${competitionId}/sports`)),
    enabled: !!tenantId && !!competitionId,
  });

  const { data: allSports } = useQuery({
    queryKey: ['sports', 'library'],
    queryFn: async () => assertOk(await apiGet<ListRes>('/sports')),
    enabled: !!tenantId,
  });

  const queryClient = useQueryClient();

  const addSport = useMutation({
    mutationFn: async (payload: { sportId: string } & CoordinatorDraft) => {
      const r = await apiPost(`/tenants/${tenantId}/competitions/${competitionId}/sports`, {
        sportId: payload.sportId,
        enabled: true,
        coordinatorName: payload.name.trim() || undefined,
        coordinatorPhone: payload.phone.trim() || undefined,
        coordinatorEmail: payload.email.trim() || undefined,
      });
      if (!r.ok && r.error.statusCode === 402) throw new ApiClientError(r.error.message, 402, r.error.code);
      return assertOk(r);
    },
    onSuccess: () => {
      setLimitError(null);
      setDialogError(null);
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'] });
    },
    onError: (err: unknown) => {
      const ac = err instanceof ApiClientError ? err : null;
      if (ac?.statusCode === 402) setLimitError(ac.message || 'Upgrade to Pro to enable more sports.');
      else setDialogError(ac?.message ?? 'Could not enable sport');
    },
  });

  const patchCoordinator = useMutation({
    mutationFn: async (payload: { id: string } & CoordinatorDraft) => {
      return assertOk(
        await apiPatch(`/tenants/${tenantId}/competition-sports/${payload.id}`, {
          coordinatorName: payload.name.trim() || null,
          coordinatorPhone: payload.phone.trim() || null,
          coordinatorEmail: payload.email.trim() || null,
        })
      );
    },
    onSuccess: () => {
      setDialogError(null);
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competition-sports'] });
    },
    onError: (err: unknown) => {
      setDialogError(err instanceof ApiClientError ? err.message : 'Could not save coordinator');
    },
  });

  function closeDialog() {
    setEnableTarget(null);
    setEditTarget(null);
    setDraft(emptyDraft());
    setDialogError(null);
  }

  function openEnable(s: Sport) {
    setEditTarget(null);
    setDraft(emptyDraft());
    setDialogError(null);
    setEnableTarget({ sportId: s.id, sportName: s.name });
  }

  function openEdit(cs: CompetitionSport) {
    setEnableTarget(null);
    setDialogError(null);
    setDraft({
      name: cs.coordinatorName ?? '',
      phone: cs.coordinatorPhone ?? '',
      email: cs.coordinatorEmail ?? '',
    });
    setEditTarget(cs);
  }

  function submitDialog() {
    setDialogError(null);
    if (enableTarget) {
      addSport.mutate({ sportId: enableTarget.sportId, ...draft });
      return;
    }
    if (editTarget) {
      patchCoordinator.mutate({ id: editTarget.id, ...draft });
    }
  }

  const dialogOpen = enableTarget !== null || editTarget !== null;
  const pending = addSport.isPending || patchCoordinator.isPending;

  const enabledList = compSports?.data?.filter((s) => s.enabled) ?? [];
  const enabledIds = new Set(enabledList.map((s) => s.sportId));
  const atLimit = !entitlements?.canUseAllSports && enabledList.length >= (entitlements?.sportsEnabledLimit ?? 2);

  if (!tenantId) return <p>Loading...</p>;

  return (
    <div>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {enableTarget
                ? `Enable ${enableTarget.sportName}`
                : editTarget
                  ? `Sports coordinator — ${editTarget.sport.name}`
                  : ''}
            </DialogTitle>
            <DialogDescription>
              Optional contact for the person coordinating this sport in this competition (name, phone, email).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="coord-name">Coordinator name</Label>
              <Input
                id="coord-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="coord-phone">Phone</Label>
              <Input
                id="coord-phone"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                className="mt-1"
                placeholder="Optional"
                type="tel"
              />
            </div>
            <div>
              <Label htmlFor="coord-email">Email</Label>
              <Input
                id="coord-email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                className="mt-1"
                placeholder="Optional"
                type="email"
              />
            </div>
            {dialogError && (
              <p className="text-sm text-destructive" role="alert">
                {dialogError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={submitDialog} disabled={pending}>
              {pending ? 'Saving…' : enableTarget ? 'Enable sport' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <Link href={`/app/competitions/${competitionId}`} className="text-sm text-muted-foreground hover:underline">
          ← Competition
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-muted">{entitlements?.isProActive ? 'Pro' : 'Trial'}</span>
          {!entitlements?.canUseAllSports && (
            <span className="text-sm text-muted-foreground">
              Enabled {enabledList.length} of {entitlements?.sportsEnabledLimit} allowed
            </span>
          )}
          <Link href="/app/billing">
            <Button variant="outline" size="sm">
              Billing
            </Button>
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Enable sports from library</h1>
      {limitError && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between flex-wrap gap-2">
          <span>{limitError}</span>
          <Link href="/app/billing">
            <Button size="sm">Upgrade to Pro</Button>
          </Link>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {allSports?.data?.map((s) => {
          const cs = compSports?.data?.find((row) => row.sportId === s.id);
          const enabled = enabledIds.has(s.id);
          return (
            <Card key={s.id}>
              <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="font-medium">
                    {s.name} ({s.sportType})
                  </span>
                  {enabled && cs && (cs.coordinatorName || cs.coordinatorPhone || cs.coordinatorEmail) && (
                    <p className="text-xs text-muted-foreground mt-2 max-w-[18rem]">
                      {cs.coordinatorName ?? ''}
                      {cs.coordinatorPhone
                        ? `${cs.coordinatorName ? ' · ' : ''}${cs.coordinatorPhone}`
                        : ''}
                      {cs.coordinatorEmail ? (
                        <>
                          {cs.coordinatorName || cs.coordinatorPhone ? ' · ' : ''}
                          <a href={`mailto:${cs.coordinatorEmail}`} className="underline hover:text-foreground">
                            {cs.coordinatorEmail}
                          </a>
                        </>
                      ) : null}
                    </p>
                  )}
                  {enabled && cs && !cs.coordinatorName && !cs.coordinatorPhone && !cs.coordinatorEmail && (
                    <p className="text-xs text-muted-foreground mt-2">No coordinator set</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                  {enabled && cs ? (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(cs)}>
                        Edit coordinator
                      </Button>
                      <Link href={`/app/competitions/${competitionId}/sport/${cs.id}`}>
                        <Button variant="outline" size="sm">
                          Open
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Button type="button" size="sm" onClick={() => openEnable(s)} disabled={pending || atLimit}>
                      Enable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

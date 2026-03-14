'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { apiGet, apiPut, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CertificateTemplate } from '@/components/certificate/CertificateTemplate';

type ParticipantEntry = {
  id: string;
  student: {
    id: string;
    admissionNo: string;
    fullName: string;
    classStandard: string;
    section?: string | null;
  };
};

type LeaderboardEntry = {
  participantEntryId: string;
  numericValue: number;
  displayValue: string;
  rank: number;
  participantEntry: {
    student: {
      id: string;
      admissionNo: string;
      fullName: string;
      classStandard: string;
      section?: string | null;
    };
  };
};

type ResultDraft = { participantEntryId: string; numericValue: string; displayValue: string; rank: string };

type TenantProfile = {
  name: string;
  logoUrl: string | null;
  certificateConfig: { signatureLabels: string[] };
};

type CategoryWithCompetition = {
  name: string;
  competitionSport: { competition: { name: string; startDate: string } };
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

/** Compute ranks from numeric values: same value = same rank (e.g. 1, 1, 3, 4). */
function computeRanks(
  drafts: Record<string, ResultDraft>,
  higherIsBetter: boolean
): Record<string, ResultDraft> {
  const entries = Object.entries(drafts)
    .map(([id, d]) => ({ id, num: parseFloat(d.numericValue) }))
    .filter(({ num }) => !Number.isNaN(num));
  entries.sort((a, b) => (higherIsBetter ? b.num - a.num : a.num - b.num));
  let rank = 1;
  let prevNum: number | null = null;
  const rankByEntryId: Record<string, number> = {};
  for (let i = 0; i < entries.length; i++) {
    const { id, num } = entries[i];
    if (prevNum !== null && num !== prevNum) rank = i + 1;
    rankByEntryId[id] = rank;
    prevNum = num;
  }
  const next: Record<string, ResultDraft> = {};
  for (const [id, d] of Object.entries(drafts)) {
    const r = rankByEntryId[id];
    next[id] = { ...d, rank: r !== undefined ? String(r) : d.rank };
  }
  return next;
}

export default function LeaderboardPage() {
  const params = useParams();
  const competitionSportId = params.competitionSportId as string;
  const categoryId = params.categoryId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  /** For auto-rank: true = higher score is better (e.g. points, distance); false = lower is better (e.g. time). */
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [printingEntryId, setPrintingEntryId] = useState<string | null>(null);
  const certRefsMap = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: participantsData, isLoading: participantsLoading } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'participants'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: ParticipantEntry[] }>(
          `/tenants/${tenantId}/categories/${categoryId}/participants`
        )
      ),
    enabled: !!tenantId && !!categoryId,
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'leaderboard'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: LeaderboardEntry[] }>(
          `/tenants/${tenantId}/categories/${categoryId}/leaderboard`
        )
      ),
    enabled: !!tenantId && !!categoryId,
  });

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => assertOk(await apiGet<TenantProfile>(`/tenants/${tenantId}`)),
    enabled: !!tenantId && certModalOpen,
  });

  const { data: categoryData } = useQuery({
    queryKey: [tenantId, 'competition-sports', competitionSportId, 'categories', categoryId],
    queryFn: async () =>
      assertOk(
        await apiGet<CategoryWithCompetition>(
          `/tenants/${tenantId}/competition-sports/${competitionSportId}/categories/${categoryId}`
        )
      ),
    enabled: !!tenantId && !!competitionSportId && !!categoryId && certModalOpen,
  });

  useEffect(() => {
    const participants = participantsData?.data ?? [];
    const results = leaderboardData?.data ?? [];
    const next: Record<string, ResultDraft> = {};
    for (const p of participants) {
      const existing = results.find((r) => r.participantEntryId === p.id);
      next[p.id] = {
        participantEntryId: p.id,
        numericValue: existing ? String(existing.numericValue) : '',
        displayValue: existing?.displayValue ?? '',
        rank: existing ? String(existing.rank) : '',
      };
    }
    setDrafts(next);
  }, [participantsData?.data, leaderboardData?.data]);

  const saveResults = useMutation({
    mutationFn: async () => {
      const results = Object.values(drafts)
        .filter((d) => d.numericValue.trim() !== '' && d.rank.trim() !== '')
        .map((d) => ({
          participantEntryId: d.participantEntryId,
          numericValue: Number(d.numericValue),
          displayValue: d.displayValue || d.numericValue,
          rank: Number(d.rank),
        }));
      return assertOk(
        await apiPut(`/tenants/${tenantId}/categories/${categoryId}/results`, { results })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'leaderboard'] });
    },
  });

  if (!tenantId) return <p>Loading...</p>;
  if (participantsLoading || leaderboardLoading) return <p>Loading leaderboard...</p>;

  const participants = participantsData?.data ?? [];
  const leaderboardEntries = (leaderboardData?.data ?? []).slice().sort((a, b) => a.rank - b.rank);
  const canGenerateCerts = leaderboardEntries.length > 0;
  const certDate =
    categoryData?.competitionSport?.competition?.startDate
      ? new Date(categoryData.competitionSport.competition.startDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const handlePrintCertificate = (entry: LeaderboardEntry) => {
    setPrintingEntryId(entry.participantEntryId);
    setTimeout(() => {
      window.print();
      setPrintingEntryId(null);
    }, 100);
  };

  const handleDownloadCertificate = async (entry: LeaderboardEntry) => {
    const el = certRefsMap.current[entry.participantEntryId];
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      const imgH = w * (9 / 16);
      pdf.addImage(imgData, 'PNG', 0, (h - imgH) / 2, w, imgH);
      pdf.save(`certificate-${entry.participantEntry.student.fullName.replace(/\s+/g, '-')}-rank-${entry.rank}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Download failed. Try Print and choose "Save as PDF".');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to category
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!canGenerateCerts}
            onClick={() => setCertModalOpen(true)}
          >
            Generate certificates
          </Button>
          <Link href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/participants`}>
            <Button variant="outline">Participants</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Individual results</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Numeric value</strong> is the raw score used for ranking (e.g. points, time in seconds, distance).{' '}
            <strong>Display value</strong> is the human-readable form shown in reports (e.g. &quot;14.5 sec&quot;, &quot;9 pts&quot;). You can auto-fill ranks from numeric values below.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {participants.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pb-2 border-b">
              <span className="text-sm text-muted-foreground">Rank by:</span>
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={higherIsBetter ? 'higher' : 'lower'}
                onChange={(e) => setHigherIsBetter(e.target.value === 'higher')}
              >
                <option value="higher">Higher is better</option>
                <option value="lower">Lower is better</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrafts((prev) => computeRanks(prev, higherIsBetter))}
              >
                Auto-fill ranks
              </Button>
            </div>
          )}
          {participants.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No participants found. Add participants first.
            </p>
          )}
          {participants.map((p) => {
            const draft = drafts[p.id] ?? {
              participantEntryId: p.id,
              numericValue: '',
              displayValue: '',
              rank: '',
            };
            return (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-end rounded-md border p-2">
                <div>
                  <p className="font-medium">{p.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.student.admissionNo} · {p.student.classStandard}
                    {p.student.section ? `-${p.student.section}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Numeric value</p>
                  <Input
                    type="number"
                    value={draft.numericValue}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [p.id]: { ...draft, numericValue: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Display value</p>
                  <Input
                    value={draft.displayValue}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [p.id]: { ...draft, displayValue: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rank</p>
                  <Input
                    type="number"
                    value={draft.rank}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [p.id]: { ...draft, rank: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}

          {participants.length > 0 && (
            <Button onClick={() => saveResults.mutate()} disabled={saveResults.isPending}>
              {saveResults.isPending ? 'Saving...' : 'Save results'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Certificate modal */}
      <Dialog.Root open={certModalOpen} onOpenChange={setCertModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">Generate certificates</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">Close</Button>
              </Dialog.Close>
            </div>
            {(!tenantProfile || !categoryData) && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {tenantProfile && categoryData && leaderboardEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">Save results first to generate certificates.</p>
            )}
            {tenantProfile && categoryData && leaderboardEntries.length > 0 && (
              <ul className="space-y-6">
                {leaderboardEntries.map((entry) => (
                  <li key={entry.participantEntryId} className="rounded border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {entry.participantEntry.student.fullName} — Rank {entry.rank}
                        {entry.displayValue ? ` (${entry.displayValue})` : ''}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintCertificate(entry)}
                        >
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCertificate(entry)}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </div>
                    <div
                      ref={(el) => {
                        certRefsMap.current[entry.participantEntryId] = el;
                      }}
                    >
                      <CertificateTemplate
                        competitionName={categoryData.competitionSport.competition.name}
                        categoryName={categoryData.name}
                        studentName={entry.participantEntry.student.fullName}
                        rank={entry.rank}
                        displayValue={entry.displayValue || undefined}
                        date={certDate}
                        tenantName={tenantProfile.name}
                        logoUrl={tenantProfile.logoUrl}
                        signatureLabels={tenantProfile.certificateConfig?.signatureLabels ?? ['Principal', 'Sports Teacher']}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Print-only view: show single certificate when printing */}
      {printingEntryId && (
        <div className="cert-print-root hidden print:block fixed inset-0 z-[100] bg-white">
          <div className="p-0 w-full h-full flex items-center justify-center">
            {leaderboardEntries
              .filter((e) => e.participantEntryId === printingEntryId)
              .map((entry) =>
                tenantProfile && categoryData ? (
                  <CertificateTemplate
                    key={entry.participantEntryId}
                    competitionName={categoryData.competitionSport.competition.name}
                    categoryName={categoryData.name}
                    studentName={entry.participantEntry.student.fullName}
                    rank={entry.rank}
                    displayValue={entry.displayValue || undefined}
                    date={certDate}
                    tenantName={tenantProfile.name}
                    logoUrl={tenantProfile.logoUrl}
                    signatureLabels={tenantProfile.certificateConfig?.signatureLabels ?? ['Principal', 'Sports Teacher']}
                    className="w-full max-w-4xl"
                  />
                ) : null
              )}
          </div>
        </div>
      )}
    </div>
  );
}


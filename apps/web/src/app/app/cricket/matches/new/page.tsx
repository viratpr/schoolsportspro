'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Competition = { id: string; name: string };
type Category = { id: string; name: string };
type Team = { id: string; name: string };

const schema = z
  .object({
    competitionId: z.string().min(1, 'Select a competition'),
    categoryId: z.string().min(1, 'Select a category'),
    teamAId: z.string().min(1, 'Select Team A'),
    teamBId: z.string().min(1, 'Select Team B'),
    oversLimit: z.number().int().min(1).max(999),
    tossWinnerTeamId: z.string().min(1, 'Select toss winner'),
    tossDecision: z.enum(['BAT', 'BOWL']),
    scheduledAt: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.teamAId !== d.teamBId, { message: 'Team A and Team B must be different', path: ['teamBId'] })
  .refine(
    (d) => d.tossWinnerTeamId === d.teamAId || d.tossWinnerTeamId === d.teamBId,
    { message: 'Toss winner must be Team A or Team B', path: ['tossWinnerTeamId'] }
  );

type FormData = z.infer<typeof schema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function NewCricketMatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: comps } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions'],
    queryFn: async () => assertOk(await apiGet<{ data: Competition[] }>(`/tenants/${tenantId}/competitions`)),
    enabled: !!tenantId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      oversLimit: 20,
      tossDecision: 'BAT',
    },
  });

  const competitionId = watch('competitionId');
  const categoryId = watch('categoryId');

  const { data: sports } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions', competitionId, 'sports'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: { id: string; sport: { scoringModel: string } }[] }>(
          `/tenants/${tenantId}/competitions/${competitionId}/sports`
        )
      ),
    enabled: !!tenantId && !!competitionId,
  });
  const cricketSportId = sports?.data?.find((s) => s.sport.scoringModel === 'CRICKET_LITE')?.id;

  const { data: categories } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', cricketSportId, 'categories'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: Category[] }>(
          `/tenants/${tenantId}/competition-sports/${cricketSportId}/categories`
        )
      ),
    enabled: !!tenantId && !!cricketSportId,
  });

  const { data: teamsData } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'teams'],
    queryFn: async () =>
      assertOk(await apiGet<{ data: Team[] }>(`/tenants/${tenantId}/categories/${categoryId}/teams`)),
    enabled: !!tenantId && !!categoryId,
  });
  const teams = teamsData?.data ?? [];

  async function onSubmit(data: FormData) {
    if (!tenantId) return;
    setSubmitError(null);
    const r = await apiPost<{ id: string }>(`/tenants/${tenantId}/cricket/matches`, {
      competitionId: data.competitionId,
      categoryId: data.categoryId,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      oversLimit: data.oversLimit,
      ballsPerOver: 6,
      tossWinnerTeamId: data.tossWinnerTeamId,
      tossDecision: data.tossDecision,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      notes: data.notes || undefined,
    });
    if (!r.ok) {
      const details = r.error.details as Record<string, string[] | undefined> | undefined;
      const fieldMessages = details
        ? Object.entries(details)
            .flatMap(([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`))
            .join('. ')
        : '';
      setSubmitError(fieldMessages ? `${r.error.message}: ${fieldMessages}` : r.error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'cricket', 'matches'] });
    router.push(`/app/cricket/matches/${r.data.id}`);
  }

  if (!tenantId) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/cricket/matches" className="text-sm text-muted-foreground hover:underline">
          ← Cricket scorecards
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">New cricket match</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Match setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <div>
              <Label>Competition</Label>
              <Select
                onValueChange={(v) => {
                  setValue('competitionId', v);
                  setValue('categoryId', '');
                  setValue('teamAId', '');
                  setValue('teamBId', '');
                  setValue('tossWinnerTeamId', '');
                }}
                value={watch('competitionId') || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select competition" />
                </SelectTrigger>
                <SelectContent>
                  {comps?.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.competitionId && (
                <p className="text-sm text-destructive">{errors.competitionId.message}</p>
              )}
            </div>

            <div>
              <Label>Category (Cricket)</Label>
              <Select
                onValueChange={(v) => {
                  setValue('categoryId', v);
                  setValue('teamAId', '');
                  setValue('teamBId', '');
                  setValue('tossWinnerTeamId', '');
                }}
                value={watch('categoryId') || undefined}
                disabled={!cricketSportId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!cricketSportId && competitionId && (
                <p className="text-sm text-muted-foreground">Enable Cricket for this competition first.</p>
              )}
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team A</Label>
                <Select onValueChange={(v) => setValue('teamAId', v)} value={watch('teamAId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teamAId && (
                  <p className="text-sm text-destructive">{errors.teamAId.message}</p>
                )}
              </div>
              <div>
                <Label>Team B</Label>
                <Select onValueChange={(v) => setValue('teamBId', v)} value={watch('teamBId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teamBId && (
                  <p className="text-sm text-destructive">{errors.teamBId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Overs per innings</Label>
              <Select
                onValueChange={(v) => setValue('oversLimit', Number(v))}
                value={String(watch('oversLimit'))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Toss winner</Label>
              <Select
                onValueChange={(v) => setValue('tossWinnerTeamId', v)}
                value={watch('tossWinnerTeamId')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Team A or B" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tossWinnerTeamId && (
                <p className="text-sm text-destructive">{errors.tossWinnerTeamId.message}</p>
              )}
            </div>

            <div>
              <Label>Toss decision</Label>
              <Select
                onValueChange={(v) => setValue('tossDecision', v as 'BAT' | 'BOWL')}
                value={watch('tossDecision')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAT">Bat</SelectItem>
                  <SelectItem value="BOWL">Bowl</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scheduled date/time (optional)</Label>
              <Input type="datetime-local" {...register('scheduledAt')} />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input {...register('notes')} placeholder="Optional notes" />
            </div>

            <Button type="submit">Create match</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

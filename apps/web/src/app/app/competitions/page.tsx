'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiGetTenantCompetitions, apiPatch, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  venue: z.string().optional(),
  status: z.enum(['DRAFT', 'LIVE', 'CLOSED']),
});
type EditForm = z.infer<typeof editSchema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function CompetitionsPage() {
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [viewingCompetition, setViewingCompetition] = useState<Competition | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { status: 'DRAFT' },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tenants', tenantId, 'competitions'],
    queryFn: async () => assertOk(await apiGetTenantCompetitions<ListRes>(tenantId!)),
    enabled: !!tenantId,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: EditForm }) =>
      assertOk(
        await apiPatch<Competition>(`/tenants/${tenantId}/competitions/${id}`, {
          ...body,
          startDate: new Date(body.startDate).toISOString(),
          endDate: new Date(body.endDate).toISOString(),
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions'] });
      setEditingCompetition(null);
      setViewingCompetition(null);
      reset({ status: 'DRAFT' });
    },
  });

  useEffect(() => {
    if (editingCompetition) {
      reset({
        name: editingCompetition.name,
        academicYear: editingCompetition.academicYear,
        startDate: editingCompetition.startDate.slice(0, 10),
        endDate: editingCompetition.endDate.slice(0, 10),
        venue: editingCompetition.venue ?? '',
        status: editingCompetition.status as 'DRAFT' | 'LIVE' | 'CLOSED',
      });
    }
  }, [editingCompetition, reset]);

  if (!tenantId) return <p>Loading session...</p>;

  if (editingCompetition) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => { setEditingCompetition(null); reset({ status: 'DRAFT' }); }}>
          ← Back
        </Button>
        <Card className="max-w-md">
          <CardHeader><CardTitle>Edit competition</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((formData) =>
                updateMutation.mutate({ id: editingCompetition.id, body: formData })
              )}
              className="space-y-4"
            >
              <div>
                <Label>Name</Label>
                <Input {...register('name')} placeholder="Annual Sports Meet 2026" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Academic year</Label>
                <Input {...register('academicYear')} placeholder="2025-26" />
                {errors.academicYear && <p className="text-sm text-destructive">{errors.academicYear.message}</p>}
              </div>
              <div>
                <Label>Start date</Label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" {...register('endDate')} />
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
              </div>
              <div>
                <Label>Venue (optional)</Label>
                <Input {...register('venue')} />
              </div>
              <div>
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="LIVE">Live</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              {updateMutation.isError && (
                <p className="text-sm text-destructive">
                  {updateMutation.error instanceof Error ? updateMutation.error.message : 'Update failed.'}
                </p>
              )}
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {error instanceof Error && /timed out/i.test(error.message) && (
            <p className="mt-2 text-muted-foreground text-sm">
              The competitions list uses a fast Next.js route. If you still see timeouts, check{' '}
              <code className="bg-muted px-1 rounded">DATABASE_URL</code> and Deployment → Logs. Local full API:{' '}
              <code className="bg-muted px-1 rounded">pnpm --filter @bharatathlete/api dev</code>.
            </p>
          )}
        </div>
      )}
      {!isLoading && !isError && data?.data && data.data.length > 0 && (
        <div className="space-y-2">
          {data.data.map((c) => (
            <div key={c.id} className="space-y-2">
              <Card>
                <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.academicYear} · {c.status}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setViewingCompetition(viewingCompetition?.id === c.id ? null : c)}>
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingCompetition(c)}>Edit</Button>
                    <Link href={`/app/competitions/${c.id}`}>
                      <Button variant="outline" size="sm">Open</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              {viewingCompetition?.id === c.id && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>Competition details</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setViewingCompetition(null); setEditingCompetition(viewingCompetition); }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setViewingCompetition(null)}>Close</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <p><span className="font-medium text-muted-foreground">Name:</span> {viewingCompetition.name}</p>
                    <p><span className="font-medium text-muted-foreground">Academic year:</span> {viewingCompetition.academicYear}</p>
                    <p><span className="font-medium text-muted-foreground">Start date:</span> {formatDate(viewingCompetition.startDate)}</p>
                    <p><span className="font-medium text-muted-foreground">End date:</span> {formatDate(viewingCompetition.endDate)}</p>
                    {viewingCompetition.venue && <p><span className="font-medium text-muted-foreground">Venue:</span> {viewingCompetition.venue}</p>}
                    <p><span className="font-medium text-muted-foreground">Status:</span> {viewingCompetition.status}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) && (
        <p className="text-muted-foreground">No competitions yet. <Link href="/app/competitions/new" className="text-primary underline">Create one</Link> to get started.</p>
      )}
    </div>
  );
}

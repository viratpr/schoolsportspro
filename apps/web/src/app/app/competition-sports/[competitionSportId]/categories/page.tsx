'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Category = { id: string; name: string; gender: string; format: string };
type ListRes = { data: Category[] };

type CompetitionSport = {
  id: string;
  sport: {
    name: string;
    sportType: string;
    defaultCategoryTemplatesJson: unknown;
  };
};

type CategoryTemplate = { name: string; gender: string; eligibility?: object; matchFormat?: string };

const createSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(['BOYS', 'GIRLS', 'MIXED', 'OPEN']),
  format: z.enum(['KNOCKOUT', 'INDIVIDUAL']),
  eligibilityJson: z.record(z.unknown()).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function getWorkflowHint(sportType: string): string {
  if (sportType === 'TEAM') return 'Workflow: Create category (KNOCKOUT) → Teams → Add members → Generate bracket → Play matches.';
  return 'Workflow: Create category (INDIVIDUAL) → Add participants → Enter results / leaderboard.';
}

export default function CompetitionSportCategoriesPage() {
  const params = useParams();
  const competitionSportId = params.competitionSportId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [createOpen, setCreateOpen] = useState(false);
  const [fromTemplateOpen, setFromTemplateOpen] = useState(false);
  const [selectedTemplateIndices, setSelectedTemplateIndices] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId, 'categories'],
    queryFn: async () =>
      assertOk(await apiGet<ListRes>(`/tenants/${tenantId}/competition-sports/${competitionSportId}/categories`)),
    enabled: !!tenantId && !!competitionSportId,
  });

  const { data: competitionSport } = useQuery({
    queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId],
    queryFn: async () =>
      assertOk(await apiGet<CompetitionSport>(`/tenants/${tenantId}/competition-sports/${competitionSportId}`)),
    enabled: !!tenantId && !!competitionSportId,
  });

  const templates = (Array.isArray(competitionSport?.sport?.defaultCategoryTemplatesJson)
    ? competitionSport!.sport.defaultCategoryTemplatesJson as CategoryTemplate[]
    : []) as CategoryTemplate[];

  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { gender: 'BOYS', format: 'KNOCKOUT', eligibilityJson: {} },
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateForm) =>
      assertOk(await apiPost(`/tenants/${tenantId}/competition-sports/${competitionSportId}/categories`, {
        ...body,
        eligibilityJson: body.eligibilityJson ?? {},
      })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId, 'categories'] });
      setCreateOpen(false);
    },
  });

  const fromTemplatesMutation = useMutation({
    mutationFn: async () =>
      assertOk(await apiPost<{ created: { id: string; name: string }[] }>(
        `/tenants/${tenantId}/competition-sports/${competitionSportId}/categories/from-templates`,
        { templateIndices: selectedTemplateIndices }
      )),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competition-sports', competitionSportId, 'categories'] });
      setFromTemplateOpen(false);
      setSelectedTemplateIndices([]);
    },
  });

  const toggleTemplate = (i: number) => {
    setSelectedTemplateIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)
    );
  };

  if (!tenantId) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/competitions" className="text-sm text-muted-foreground hover:underline">← Competitions</Link>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Button variant="outline" onClick={() => setFromTemplateOpen(!fromTemplateOpen)}>
              {fromTemplateOpen ? 'Cancel' : 'Create from templates'}
            </Button>
          )}
          <Button onClick={() => setCreateOpen(!createOpen)}>{createOpen ? 'Cancel' : 'Add category'}</Button>
        </div>
      </div>
      {competitionSport?.sport && (
        <p className="text-xs text-muted-foreground mb-4 border-l-2 border-muted pl-2">
          {getWorkflowHint(competitionSport.sport.sportType)}
        </p>
      )}
      {fromTemplateOpen && templates.length > 0 && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Select templates to create categories:</p>
            <ul className="space-y-2 mb-4">
              {templates.map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTemplateIndices.includes(i)}
                    onChange={() => toggleTemplate(i)}
                  />
                  <span>{t.name} · {t.gender}{t.matchFormat ? ` · ${t.matchFormat}` : ''}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => fromTemplatesMutation.mutate()}
              disabled={fromTemplatesMutation.isPending || selectedTemplateIndices.length === 0}
            >
              Create {selectedTemplateIndices.length} categor{selectedTemplateIndices.length === 1 ? 'y' : 'ies'}
            </Button>
          </CardContent>
        </Card>
      )}
      {createOpen && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 max-w-md">
              <div>
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Gender</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('gender')}>
                  <option value="BOYS">Boys</option>
                  <option value="GIRLS">Girls</option>
                  <option value="MIXED">Mixed</option>
                  <option value="OPEN">Open</option>
                </select>
              </div>
              <div>
                <Label>Format</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('format')}>
                  <option value="KNOCKOUT">Knockout (team)</option>
                  <option value="INDIVIDUAL">Individual</option>
                </select>
              </div>
              <Button type="submit" disabled={createMutation.isPending}>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p>Loading...</p>}
      {data?.data?.map((c) => (
        <Card key={c.id} className="mb-2">
          <CardContent className="py-4 flex items-center justify-between">
            <span>{c.name} · {c.gender} · {c.format}</span>
            <Link href={`/app/competition-sports/${competitionSportId}/categories/${c.id}`}>
              <Button variant="outline" size="sm">Open</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

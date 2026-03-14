'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, apiPost, apiPatch, apiDelete, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Student = {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: string;
  classStandard: string;
  section?: string;
  house?: string;
  active: boolean;
  createdAt: string;
};
type ListRes = { data: Student[]; nextCursor: string | null };

const createSchema = z.object({
  admissionNo: z.string().min(1),
  fullName: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  classStandard: z.string().min(1),
  section: z.string().optional(),
  house: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; createdIds: string[]; errors: string[] } | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', tenantId, 'students', cursor, search],
    queryFn: async () =>
      assertOk(await apiGet<ListRes>(`/tenants/${tenantId}/students`, {
        ...(cursor ? { cursor } : {}),
        ...(search ? { q: search } : {}),
        limit: '20',
      })),
    enabled: !!tenantId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { gender: 'MALE' },
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateForm) => assertOk(await apiPost<Student>(`/tenants/${tenantId}/students`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'students'] });
      setCreateOpen(false);
      reset();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (csv: string) =>
      assertOk(
        await apiPost<{ created: number; createdIds: string[]; errors: string[] }>(
          `/tenants/${tenantId}/students/import-csv`,
          { csv }
        )
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'students'] });
      setImportResult(data);
      setImportCsv('');
    },
  });

  if (!tenantId) return <p>Loading session...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(!importOpen); setImportResult(null); }}>
            {importOpen ? 'Cancel' : 'Import CSV'}
          </Button>
          <Button onClick={() => setCreateOpen(!createOpen)}>{createOpen ? 'Cancel' : 'Add student'}</Button>
        </div>
      </div>
      <div className="mb-4">
        <Input
          placeholder="Search by name or admission no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {importOpen && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Import students from CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste CSV with header: admissionNo, fullName, gender (MALE/FEMALE/OTHER), class (or classStandard), section, house.
            </p>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder={'admissionNo,fullName,gender,class,section,house\n001,Ramesh Kumar,MALE,5,A,Red'}
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => importMutation.mutate(importCsv)}
                disabled={!importCsv.trim() || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing…' : 'Import'}
              </Button>
            </div>
            {importResult && (
              <div className="text-sm">
                <p className="font-medium">Result: {importResult.created} row(s) imported.</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-destructive">
                    {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {importResult.errors.length > 10 && (
                      <li>… and {importResult.errors.length - 10} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {createOpen && (
        <Card className="mb-4">
          <CardHeader><CardTitle>New student</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 max-w-md">
              <div>
                <Label>Admission no</Label>
                <Input {...register('admissionNo')} />
                {errors.admissionNo && <p className="text-sm text-destructive">{errors.admissionNo.message}</p>}
              </div>
              <div>
                <Label>Full name</Label>
                <Input {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label>Gender</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('gender')}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label>Class</Label>
                <Input {...register('classStandard')} />
                {errors.classStandard && <p className="text-sm text-destructive">{errors.classStandard.message}</p>}
              </div>
              <div>
                <Label>Section (optional)</Label>
                <Input {...register('section')} />
              </div>
              <div>
                <Label>House (optional)</Label>
                <Input {...register('house')} />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p>Loading...</p>}
      {data?.data && (
        <div className="space-y-2">
          {data.data.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-sm text-muted-foreground">{s.admissionNo} · {s.classStandard}{s.section ? `-${s.section}` : ''}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {data.nextCursor && (
            <Button variant="outline" onClick={() => setCursor(data.nextCursor!)}>Load more</Button>
          )}
        </div>
      )}
    </div>
  );
}

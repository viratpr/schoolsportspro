'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, apiPost, apiPatch, apiDelete, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
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
  admissionNo: z.string().min(1, 'Please enter admission number'),
  fullName: z.string().min(1, 'Please enter student\'s full name'),
  gender: z
    .string()
    .min(1, 'Please select gender')
    .refine((v) => ['MALE', 'FEMALE', 'OTHER'].includes(v), 'Please select gender'),
  classStandard: z.string().min(1, 'Please enter class or standard'),
  section: z.string().optional(),
  house: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const SAMPLE_CSV = `admissionNo,fullName,gender,class,section,house
001,Ramesh Kumar,MALE,5,A,Red
002,Priya Sharma,FEMALE,5,B,Blue
003,Amit Singh,MALE,6,C,Green`;

export default function StudentsPage() {
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; createdIds: string[]; errors: string[] } | null>(null);
  const [search, setSearch] = useState('');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const cursor = cursorStack[currentPage] ?? null;
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
    defaultValues: { gender: '' },
  });

  const editForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { gender: '' },
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: CreateForm }) =>
      assertOk(await apiPatch<Student>(`/tenants/${tenantId}/students/${id}`, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'students'] });
      setEditingStudent(null);
      editForm.reset({ gender: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const r = await apiDelete(`/tenants/${tenantId}/students/${studentId}`);
      if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'students'] });
      setViewingStudent(null);
    },
  });

  useEffect(() => {
    if (editingStudent) {
      editForm.reset({
        admissionNo: editingStudent.admissionNo,
        fullName: editingStudent.fullName,
        gender: editingStudent.gender as 'MALE' | 'FEMALE' | 'OTHER',
        classStandard: editingStudent.classStandard,
        section: editingStudent.section ?? '',
        house: editingStudent.house ?? '',
      });
    }
  }, [editingStudent]);

  if (!tenantId) return <p>Loading session...</p>;

  if (createOpen) {
    return (
      <div>
        <Card className="max-w-md">
          <CardHeader><CardTitle>New Student</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
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
                  <option value="">Select gender</option>
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
              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {createMutation.error instanceof ApiClientError && createMutation.error.statusCode === 400
                    ? 'Please check the form. Fill in all required fields correctly.'
                    : createMutation.error instanceof Error ? createMutation.error.message : 'Something went wrong. Please try again.'}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editingStudent) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => { setEditingStudent(null); editForm.reset({ gender: '' }); }}>
          ← Back
        </Button>
        <Card className="max-w-md">
          <CardHeader><CardTitle>Edit Student</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editingStudent.id, body: d }))}
              className="space-y-4"
            >
              <div>
                <Label>Admission no</Label>
                <Input {...editForm.register('admissionNo')} />
                {editForm.formState.errors.admissionNo && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.admissionNo.message}</p>
                )}
              </div>
              <div>
                <Label>Full name</Label>
                <Input {...editForm.register('fullName')} />
                {editForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...editForm.register('gender')}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label>Class</Label>
                <Input {...editForm.register('classStandard')} />
                {editForm.formState.errors.classStandard && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.classStandard.message}</p>
                )}
              </div>
              <div>
                <Label>Section (optional)</Label>
                <Input {...editForm.register('section')} />
              </div>
              <div>
                <Label>House (optional)</Label>
                <Input {...editForm.register('house')} />
              </div>
              {updateMutation.isError && (
                <p className="text-sm text-destructive">
                  {updateMutation.error instanceof ApiClientError && updateMutation.error.statusCode === 400
                    ? 'Please check the form. Fill in all required fields correctly.'
                    : updateMutation.error instanceof Error ? updateMutation.error.message : 'Something went wrong. Please try again.'}
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
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setImportOpen(!importOpen); setImportResult(null); }}
          >
            {importOpen ? 'Close' : 'Import CSV'}
          </Button>
          {!importOpen && (
            <Button onClick={() => { setImportOpen(false); setCreateOpen(true); }}>Add Student</Button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <Input
          placeholder="Search by name or admission no"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursorStack([null]);
            setCurrentPage(0);
          }}
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'students-sample.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download sample CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setImportResult(null); importFileInputRef.current?.click(); }}
              >
                Import from file
              </Button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text = typeof reader.result === 'string' ? reader.result : '';
                    setImportCsv(text);
                    setImportResult(null);
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
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
            {importMutation.isError && (
              <p className="text-sm text-destructive">
                {importMutation.error instanceof Error ? importMutation.error.message : 'Import failed.'}
              </p>
            )}
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
      {isLoading && <p>Loading...</p>}
      {deleteMutation.isError && (
        <p className="mb-4 text-sm text-destructive">
          {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Delete failed. You may not have permission.'}
        </p>
      )}
      {data?.data && (
        <div className="space-y-4">
          <div className="space-y-2">
            {data.data.map((s) => (
              <div key={s.id} className="space-y-2">
                <Card>
                  <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.fullName}</p>
                      <p className="text-sm text-muted-foreground">{s.admissionNo} · {s.classStandard}{s.section ? `-${s.section}` : ''}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { setViewingStudent(viewingStudent?.id === s.id ? null : s); deleteMutation.reset(); }}>View</Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingStudent(s)}>Edit</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Delete ${s.fullName}? This cannot be undone.`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {viewingStudent?.id === s.id && (
                  <Card className="ml-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle>Student details</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setViewingStudent(null); setEditingStudent(viewingStudent); }}>Edit</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(`Delete ${viewingStudent.fullName}? This cannot be undone.`)) {
                              deleteMutation.mutate(viewingStudent.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setViewingStudent(null); deleteMutation.reset(); }}>Close</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <p><span className="font-medium text-muted-foreground">Admission no:</span> {viewingStudent.admissionNo}</p>
                      <p><span className="font-medium text-muted-foreground">Full name:</span> {viewingStudent.fullName}</p>
                      <p><span className="font-medium text-muted-foreground">Gender:</span> {viewingStudent.gender}</p>
                      <p><span className="font-medium text-muted-foreground">Class:</span> {viewingStudent.classStandard}{viewingStudent.section ? ` · Section ${viewingStudent.section}` : ''}</p>
                      {viewingStudent.house && <p><span className="font-medium text-muted-foreground">House:</span> {viewingStudent.house}</p>}
                      <p><span className="font-medium text-muted-foreground">Status:</span> {viewingStudent.active ? 'Active' : 'Inactive'}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1}
              {data.nextCursor ? ` · ${data.data.length} per page` : data.data.length > 0 ? ` · ${data.data.length} on this page` : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const next = data.nextCursor;
                  if (next) {
                    setCursorStack((stack) => {
                      const nextIndex = currentPage + 1;
                      if (nextIndex < stack.length) return stack;
                      return [...stack, next];
                    });
                    setCurrentPage((p) => p + 1);
                  }
                }}
                disabled={!data.nextCursor}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

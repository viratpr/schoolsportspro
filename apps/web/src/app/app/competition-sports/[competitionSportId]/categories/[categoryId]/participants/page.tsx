'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPost, apiDelete, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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

type Student = {
  id: string;
  admissionNo: string;
  fullName: string;
  classStandard: string;
  section?: string;
};

type StudentsListRes = { data: Student[]; nextCursor: string | null };

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function ParticipantsPage() {
  const params = useParams();
  const competitionSportId = params.competitionSportId as string;
  const categoryId = params.categoryId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState('');

  const { data: participantsData, isLoading } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'participants'],
    queryFn: async () =>
      assertOk(
        await apiGet<{ data: ParticipantEntry[] }>(
          `/tenants/${tenantId}/categories/${categoryId}/participants`
        )
      ),
    enabled: !!tenantId && !!categoryId,
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: [tenantId, 'students', 'search', studentSearch],
    queryFn: async () =>
      assertOk(
        await apiGet<StudentsListRes>(`/tenants/${tenantId}/students`, {
          ...(studentSearch ? { q: studentSearch } : {}),
          limit: '20',
        })
      ),
    enabled: !!tenantId && !!studentSearch,
  });

  const addParticipant = useMutation({
    mutationFn: async (studentId: string) =>
      assertOk(
        await apiPost(`/tenants/${tenantId}/categories/${categoryId}/participants`, {
          studentId,
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'participants'] });
    },
  });

  const removeParticipant = useMutation({
    mutationFn: async (entryId: string) =>
      assertOk(await apiDelete(`/tenants/${tenantId}/categories/${categoryId}/participants/${entryId}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'participants'] });
    },
  });

  if (!tenantId) return <p>Loading...</p>;
  if (isLoading) return <p>Loading participants...</p>;

  const participants = participantsData?.data ?? [];
  const isParticipant = (studentId: string) => participants.some((p) => p.student.id === studentId);

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
        <h1 className="text-2xl font-bold">Participants</h1>
        <Link href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/leaderboard`}>
          <Button variant="outline">Leaderboard</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selected participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {participants.length === 0 && (
              <p className="text-sm text-muted-foreground">No participants added yet.</p>
            )}
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
                <div>
                  <p className="font-medium">{p.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.student.admissionNo} · {p.student.classStandard}
                    {p.student.section ? `-${p.student.section}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeParticipant.mutate(p.id)}
                  disabled={removeParticipant.isPending}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search students by name or admission no"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="max-w-md"
            />
            {studentSearch && (
              <>
                {studentsLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
                {studentsData?.data && (
                  <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
                    {studentsData.data.length === 0 && (
                      <p className="text-xs text-muted-foreground">No students found.</p>
                    )}
                    {studentsData.data.map((s) => {
                      const added = isParticipant(s.id);
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted text-sm">
                          <div>
                            <p className="font-medium">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.admissionNo} · {s.classStandard}
                              {s.section ? `-${s.section}` : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={added ? 'outline' : 'default'}
                            disabled={added || addParticipant.isPending}
                            onClick={() => addParticipant.mutate(s.id)}
                          >
                            {added ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


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

type TeamMember = {
  id: string;
  student: {
    id: string;
    fullName: string;
    admissionNo: string;
    classStandard: string;
    section?: string | null;
  };
};

type Team = {
  id: string;
  name: string;
  coachName?: string | null;
  members: TeamMember[];
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

export default function TeamDetailPage() {
  const params = useParams();
  const competitionSportId = params.competitionSportId as string;
  const categoryId = params.categoryId as string;
  const teamId = params.teamId as string;
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();

  const [studentSearch, setStudentSearch] = useState('');

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'teams', teamId],
    queryFn: async () =>
      assertOk(
        await apiGet<Team>(`/tenants/${tenantId}/categories/${categoryId}/teams/${teamId}`)
      ),
    enabled: !!tenantId && !!categoryId && !!teamId,
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: [tenantId, 'categories', categoryId, 'teams', teamId, 'available-students', studentSearch],
    queryFn: async () =>
      assertOk(
        await apiGet<StudentsListRes>(
          `/tenants/${tenantId}/categories/${categoryId}/teams/${teamId}/available-students`,
          {
            ...(studentSearch ? { q: studentSearch } : {}),
            limit: '20',
          }
        )
      ),
    enabled: !!tenantId && !!categoryId && !!teamId && !!studentSearch,
  });

  const addMember = useMutation({
    mutationFn: async (studentId: string) =>
      assertOk(
        await apiPost(`/tenants/${tenantId}/categories/${categoryId}/teams/${teamId}/members`, {
          studentId,
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'categories', categoryId, 'teams', teamId],
      });
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'categories', categoryId, 'teams'],
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) =>
      assertOk(
        await apiDelete(
          `/tenants/${tenantId}/categories/${categoryId}/teams/${teamId}/members/${memberId}`
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'categories', categoryId, 'teams', teamId],
      });
      queryClient.invalidateQueries({
        queryKey: [tenantId, 'categories', categoryId, 'teams'],
      });
    },
  });

  if (!tenantId) return <p>Loading...</p>;
  if (teamLoading || !team) return <p>Loading team...</p>;

  const members = team.members ?? [];

  const isInTeam = (studentId: string) =>
    members.some((m) => m.student.id === studentId);

  return (
    <div>
      <div className="mb-4 space-y-1">
        <Link
          href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}`}
          className="text-sm text-muted-foreground hover:underline block"
        >
          ← Back to category
        </Link>
        <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
          Step 1: Build your team by adding students here. Step 2: Generate the bracket from the
          category page. Step 3: Enter individual player scores on each match.
        </p>
      </div>

      <h1 className="text-2xl font-bold mb-1">{team.name}</h1>
      {team.coachName && (
        <p className="text-sm text-muted-foreground mb-4">
          Coach: {team.coachName}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No students in this team yet. Use the search panel to add students.
              </p>
            )}
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
              >
                <div>
                  <p className="font-medium">{m.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.student.admissionNo} · {m.student.classStandard}
                    {m.student.section ? `-${m.student.section}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeMember.mutate(m.id)}
                  disabled={removeMember.isPending}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add students to team</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Only students who are not in another team in this category are shown. A student can be in only one team per category.
            </p>
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
                {studentsLoading && (
                  <p className="text-sm text-muted-foreground">Searching…</p>
                )}
                {studentsData?.data && (
                  <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
                    {studentsData.data.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No students found. Try a different search.
                      </p>
                    )}
                    {studentsData.data.map((s) => {
                      const alreadyInTeam = isInTeam(s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted text-sm"
                        >
                          <div>
                            <p className="font-medium">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.admissionNo} · {s.classStandard}
                              {s.section ? `-${s.section}` : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={alreadyInTeam ? 'outline' : 'default'}
                            disabled={alreadyInTeam || addMember.isPending}
                            onClick={() => addMember.mutate(s.id)}
                          >
                            {alreadyInTeam ? 'In team' : 'Add'}
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


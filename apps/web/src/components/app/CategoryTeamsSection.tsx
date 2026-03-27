'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type CategoryTeamsSectionTeam = {
  id: string;
  name: string;
  coachName?: string;
  _count?: { members: number };
};

type ParsedTeamLine = {
  original: string;
  name: string;
  coachName?: string;
};

type BulkTeamsResultItem = ParsedTeamLine & {
  status: 'created' | 'skipped' | 'error';
  message?: string;
};

type BulkTeamsResult = { items: BulkTeamsResultItem[] };

function parseTeamsInput(raw: string): ParsedTeamLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const dashSplit = line.split(/[-–—]/);
      const commaSplit = line.split(',');
      let name = line;
      let coachName: string | undefined;
      if (dashSplit.length >= 2) {
        name = dashSplit[0].trim();
        coachName = dashSplit.slice(1).join('-').trim() || undefined;
      } else if (commaSplit.length >= 2) {
        name = commaSplit[0].trim();
        coachName = commaSplit.slice(1).join(',').trim() || undefined;
      }
      return { original: line, name, coachName };
    })
    .filter((t) => t.name.length > 0);
}

type Props = {
  tenantId: string;
  categoryId: string;
  competitionSportId: string;
  teams: CategoryTeamsSectionTeam[] | undefined;
  helpText?: string;
};

export function CategoryTeamsSection({
  tenantId,
  categoryId,
  competitionSportId,
  teams,
  helpText,
}: Props) {
  const queryClient = useQueryClient();
  const [rawTeamsInput, setRawTeamsInput] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleCoach, setSingleCoach] = useState('');
  const [singleError, setSingleError] = useState<string | null>(null);

  const parsedTeams = useMemo(() => parseTeamsInput(rawTeamsInput), [rawTeamsInput]);

  function invalidateTeams() {
    queryClient.invalidateQueries({ queryKey: [tenantId, 'categories', categoryId, 'teams'] });
    queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
  }

  const addOneTeam = useMutation({
    mutationFn: async () => {
      const name = singleName.trim();
      if (!name) throw new Error('Team name is required');
      const r = await apiPost<CategoryTeamsSectionTeam>(`/tenants/${tenantId}/categories/${categoryId}/teams`, {
        name,
        coachName: singleCoach.trim() || undefined,
      });
      if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
      return r.data;
    },
    onSuccess: () => {
      setSingleError(null);
      setSingleName('');
      setSingleCoach('');
      invalidateTeams();
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiClientError ? err.message : 'Could not add team';
      setSingleError(msg);
    },
  });

  const bulkCreateTeams = useMutation({
    mutationFn: async (input: { teams: ParsedTeamLine[] }): Promise<BulkTeamsResult> => {
      const items: BulkTeamsResultItem[] = [];
      for (const t of input.teams) {
        const res = await apiPost<CategoryTeamsSectionTeam>(`/tenants/${tenantId}/categories/${categoryId}/teams`, {
          name: t.name,
          coachName: t.coachName,
        });
        if (!res.ok) {
          const status = res.error.statusCode === 409 ? 'skipped' : 'error';
          items.push({ ...t, status, message: res.error.message });
        } else {
          items.push({ ...t, status: 'created' });
        }
      }
      return { items };
    },
    onSuccess: () => {
      invalidateTeams();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{teams?.length ?? 0} teams</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {teams?.map((t) => (
          <Link
            key={t.id}
            href={`/app/competition-sports/${competitionSportId}/categories/${categoryId}/teams/${t.id}`}
            className="flex justify-between items-center hover:bg-muted rounded-md px-2 py-1 transition-colors"
          >
            <span>
              {t.name}
              {t.coachName ? ` (${t.coachName})` : ''}
            </span>
            {typeof t._count?.members === 'number' && (
              <span className="text-xs text-muted-foreground">
                {t._count.members} member{t._count.members === 1 ? '' : 's'}
              </span>
            )}
          </Link>
        ))}
        <Tabs defaultValue="one" className="mt-4">
          <TabsList className="w-full max-w-md grid grid-cols-2">
            <TabsTrigger value="one">One team</TabsTrigger>
            <TabsTrigger value="multiple">Multiple teams</TabsTrigger>
          </TabsList>
          <TabsContent value="one" className="space-y-3">
            {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
            <div>
              <Label htmlFor="team-name-single">Team name</Label>
              <Input
                id="team-name-single"
                value={singleName}
                onChange={(e) => {
                  setSingleName(e.target.value);
                  if (singleError) setSingleError(null);
                }}
                className="mt-1 max-w-md"
                placeholder="e.g. Blue House"
              />
            </div>
            <div>
              <Label htmlFor="team-coach-single">Coach (optional)</Label>
              <Input
                id="team-coach-single"
                value={singleCoach}
                onChange={(e) => setSingleCoach(e.target.value)}
                className="mt-1 max-w-md"
                placeholder="Optional"
              />
            </div>
            {singleError && (
              <p className="text-sm text-destructive" role="alert">
                {singleError}
              </p>
            )}
            <Button
              type="button"
              onClick={() => addOneTeam.mutate()}
              disabled={addOneTeam.isPending || !singleName.trim()}
            >
              {addOneTeam.isPending ? 'Adding…' : 'Add team'}
            </Button>
          </TabsContent>
          <TabsContent value="multiple" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste or type one team per line. You can optionally add a coach name after a dash or comma.
              <br />
              Examples: &quot;Blue House&quot;, &quot;Red House - Coach Mehta&quot;, &quot;Green House, Coach Singh&quot;.
            </p>
            <textarea
              className="w-full min-h-[120px] text-sm border rounded-md px-2 py-1 bg-background"
              value={rawTeamsInput}
              onChange={(e) => setRawTeamsInput(e.target.value)}
              placeholder={'Team A\nTeam B - Coach Name\nTeam C, Coach Name'}
            />
            {parsedTeams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Preview ({parsedTeams.length} teams to create):</p>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {parsedTeams.map((t) => (
                    <div key={t.original} className="flex items-center justify-between px-2 py-1 text-sm">
                      <span>{t.name}</span>
                      <span className="text-muted-foreground">{t.coachName ? t.coachName : 'No coach'}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => bulkCreateTeams.mutate({ teams: parsedTeams })}
                  disabled={bulkCreateTeams.isPending || parsedTeams.length === 0}
                >
                  {bulkCreateTeams.isPending ? 'Creating teams…' : 'Create teams'}
                </Button>
                {bulkCreateTeams.data && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Created: {bulkCreateTeams.data.items.filter((i) => i.status === 'created').length}
                      {' · '}
                      Skipped (duplicates): {bulkCreateTeams.data.items.filter((i) => i.status === 'skipped').length}
                      {' · '}
                      Errors: {bulkCreateTeams.data.items.filter((i) => i.status === 'error').length}
                    </p>
                    {bulkCreateTeams.data.items.some((i) => i.status === 'error') && (
                      <ul className="list-disc pl-4">
                        {bulkCreateTeams.data.items
                          .filter((i) => i.status === 'error')
                          .map((i) => (
                            <li key={i.original}>
                              {i.original}: {i.message}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Match = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  status: string;
  scheduledAt: string | null;
  venue: string | null;
  teamA?: { id: string; name: string };
  teamB?: { id: string; name: string };
  winnerTeamId: string | null;
  matchScorecard?: { summaryA: string; summaryB: string; winnerTeamId: string | null };
  scorecard?: { summaryA: string; summaryB: string };
};

type LeaderboardEntry = {
  id: string;
  rank: number;
  numericValue: number;
  displayValue: string;
  participantEntry: {
    student: { fullName: string; admissionNo: string; classStandard?: string; section?: string };
  };
};

type CategoryWithData = {
  id: string;
  name: string;
  format: string;
  matches: { data: Match[]; byRound: Record<number, Match[]> };
  leaderboard: { data: LeaderboardEntry[] };
};

type FullCompetition = {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  venue: string | null;
  status: string;
  categories: CategoryWithData[];
};

async function fetchPublicCompetition(shareToken: string): Promise<FullCompetition> {
  const res = await fetch(`${API_BASE}/public/competitions/${shareToken}/full`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error ?? res.statusText ?? 'Failed to load';
    throw new Error(res.status === 404 ? 'Link invalid or expired.' : msg);
  }
  return res.json();
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return d;
  }
}

export default function PublicLivePage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['public', 'competition', shareToken],
    queryFn: () => fetchPublicCompetition(shareToken),
    enabled: !!shareToken,
    refetchInterval: 30_000,
  });

  if (!shareToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <p className="text-muted-foreground">Invalid link.</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-lg">Cannot load this page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : 'Link invalid or expired.'}
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              If the coordinator turned off the public link, this page will no longer work.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const comp = data as FullCompetition;

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold truncate">{comp.name}</h1>
            <p className="text-sm text-muted-foreground">
              {comp.academicYear}
              {comp.venue ? ` · ${comp.venue}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(comp.startDate)} – {formatDate(comp.endDate)}
              {isFetching && !isLoading && (
                <span className="ml-2">· Updating…</span>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        {comp.categories.length === 0 && (
          <p className="text-muted-foreground text-sm">No categories yet.</p>
        )}

        {comp.categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{cat.name}</CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{cat.format.toLowerCase()}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {cat.format === 'KNOCKOUT' && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Matches</h3>
                  <div className="space-y-3">
                    {Object.entries(cat.matches.byRound)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([round, matches]) => (
                        <div key={round}>
                          <p className="text-xs text-muted-foreground mb-1">Round {round}</p>
                          <ul className="space-y-1.5">
                            {matches.map((m) => {
                              const teamAName = m.teamA?.name ?? 'TBD';
                              const teamBName = m.teamB?.name ?? 'TBD';
                              const summaryA = m.matchScorecard?.summaryA ?? m.scorecard?.summaryA ?? '–';
                              const summaryB = m.matchScorecard?.summaryB ?? m.scorecard?.summaryB ?? '–';
                              const hasScore = summaryA !== '–' || summaryB !== '–';
                              return (
                                <li
                                  key={m.id}
                                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm py-1 border-b border-border/50 last:border-0"
                                >
                                  <span className="font-medium">{teamAName}</span>
                                  {hasScore ? (
                                    <span className="text-muted-foreground">
                                      {summaryA} – {summaryB}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">{m.status}</span>
                                  )}
                                  <span className="font-medium">{teamBName}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {cat.format === 'INDIVIDUAL' && cat.leaderboard.data.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Leaderboard</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Rank</th>
                          <th className="text-left py-2 font-medium">Name</th>
                          <th className="text-left py-2 font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.leaderboard.data.map((e) => (
                          <tr key={e.id} className="border-b border-border/50">
                            <td className="py-1.5">{e.rank}</td>
                            <td className="py-1.5">
                              {e.participantEntry?.student?.fullName ?? e.displayValue ?? '–'}
                            </td>
                            <td className="py-1.5 text-muted-foreground">
                              {e.displayValue || e.numericValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {cat.format === 'INDIVIDUAL' && cat.leaderboard.data.length === 0 && cat.matches.data.length === 0 && (
                <p className="text-muted-foreground text-sm">No results yet.</p>
              )}

              {cat.format === 'KNOCKOUT' && Object.keys(cat.matches.byRound).length === 0 && (
                <p className="text-muted-foreground text-sm">No matches yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

function getFlowSummary(sportType: string, templates?: Array<{ matchFormat?: string }>): string {
  if (sportType === 'TEAM') return 'Category (KNOCKOUT) → Teams → Bracket → Matches';
  const hasDoubles = templates?.some((t) => t.matchFormat === 'DOUBLES' || t.matchFormat === 'MIXED_DOUBLES');
  if (hasDoubles) return 'Category (from template) → Add pairs (coming soon) → Bracket/leaderboard';
  return 'Category (INDIVIDUAL) → Participants → Results / leaderboard';
}

type Sport = {
  id: string;
  name: string;
  sportType: string;
  scoringModel: string;
  defaultRulesText: string;
  defaultCategoryTemplatesJson: unknown;
  teamConfigJson: unknown;
  matchConfigJson: unknown;
};

const SPORT_TYPES = ['TEAM', 'INDIVIDUAL'] as const;
const SCORING_MODELS = ['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE'] as const;

export default function EditSportPage() {
  const params = useParams();
  const sportId = params.sportId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [scoringModel, setScoringModel] = useState<string>('SIMPLE_POINTS');
  const [defaultRulesText, setDefaultRulesText] = useState('');
  const [defaultCategoryTemplatesJson, setDefaultCategoryTemplatesJson] = useState('');
  const [teamConfigJson, setTeamConfigJson] = useState('');
  const [matchConfigJson, setMatchConfigJson] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: sport, isLoading } = useQuery({
    queryKey: ['platform', 'sports', sportId],
    queryFn: async () => assertOk(await apiGet<Sport>(`/platform/sports/${sportId}`)),
    enabled: !!sportId,
  });

  useEffect(() => {
    if (sport) {
      setName(sport.name);
      setSportType(sport.sportType as 'TEAM' | 'INDIVIDUAL');
      setScoringModel(sport.scoringModel);
      setDefaultRulesText(sport.defaultRulesText);
      setDefaultCategoryTemplatesJson(
        typeof sport.defaultCategoryTemplatesJson === 'string'
          ? sport.defaultCategoryTemplatesJson
          : JSON.stringify(sport.defaultCategoryTemplatesJson, null, 2)
      );
      setTeamConfigJson(
        sport.teamConfigJson != null
          ? (typeof sport.teamConfigJson === 'string' ? sport.teamConfigJson : JSON.stringify(sport.teamConfigJson, null, 2))
          : ''
      );
      setMatchConfigJson(
        sport.matchConfigJson != null
          ? (typeof sport.matchConfigJson === 'string' ? sport.matchConfigJson : JSON.stringify(sport.matchConfigJson, null, 2))
          : ''
      );
    }
  }, [sport]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      let templates: object[];
      try {
        templates = JSON.parse(defaultCategoryTemplatesJson);
        if (!Array.isArray(templates)) throw new Error('Must be an array');
      } catch (e) {
        setValidationError('defaultCategoryTemplatesJson must be a valid JSON array');
        throw e;
      }
      setValidationError(null);
      const body = {
        name: name.trim(),
        sportType,
        scoringModel,
        defaultRulesText: defaultRulesText.trim() || 'Rules TBD.',
        defaultCategoryTemplatesJson: templates,
        teamConfigJson: teamConfigJson.trim() ? (JSON.parse(teamConfigJson) as object) : undefined,
        matchConfigJson: matchConfigJson.trim() ? (JSON.parse(matchConfigJson) as object) : {},
      };
      return assertOk(await apiPatch(`/platform/sports/${sportId}`, body));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'sports'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'sports', sportId] });
      router.push('/platform/sports');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const templates = Array.isArray(sport?.defaultCategoryTemplatesJson) ? sport.defaultCategoryTemplatesJson as Array<{ matchFormat?: string }> : [];

  if (isLoading || !sport) return <p>Loading...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/platform/sports" className="text-sm text-muted-foreground hover:underline">← Sports</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Edit sport: {sport.name}</h1>
      <p className="text-sm text-muted-foreground mb-4 border-l-2 border-muted pl-2">
        Flow for this sport: {getFlowSummary(sport.sportType, templates)}
      </p>
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Basic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Sport type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sportType}
                onChange={(e) => setSportType(e.target.value as 'TEAM' | 'INDIVIDUAL')}
              >
                {SPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Scoring model</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={scoringModel}
                onChange={(e) => setScoringModel(e.target.value)}
              >
                {SCORING_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Default rules text</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={defaultRulesText}
                onChange={(e) => setDefaultRulesText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Category templates (JSON array)</CardTitle>
            <p className="text-sm text-muted-foreground">Optional matchFormat: SINGLES, DOUBLES, MIXED_DOUBLES</p>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={defaultCategoryTemplatesJson}
              onChange={(e) => setDefaultCategoryTemplatesJson(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Optional: teamConfigJson</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={teamConfigJson}
              onChange={(e) => setTeamConfigJson(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Optional: matchConfigJson</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={matchConfigJson}
              onChange={(e) => setMatchConfigJson(e.target.value)}
            />
          </CardContent>
        </Card>
        {validationError && <p className="text-sm text-destructive mb-2">{validationError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
          <Link href="/platform/sports"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}

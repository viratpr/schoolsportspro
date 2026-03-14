'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const SPORT_TYPES = ['TEAM', 'INDIVIDUAL'] as const;
const SCORING_MODELS = ['SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE'] as const;

const DEFAULT_TEMPLATES = JSON.stringify(
  [
    { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
    { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
    { name: 'Open', gender: 'OPEN', eligibility: {} },
  ],
  null,
  2
);

export default function NewSportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [scoringModel, setScoringModel] = useState<string>('SIMPLE_POINTS');
  const [defaultRulesText, setDefaultRulesText] = useState('');
  const [defaultCategoryTemplatesJson, setDefaultCategoryTemplatesJson] = useState(DEFAULT_TEMPLATES);
  const [teamConfigJson, setTeamConfigJson] = useState('');
  const [matchConfigJson, setMatchConfigJson] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useMutation({
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
      return assertOk(await apiPost('/platform/sports', body));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'sports'] });
      router.push('/platform/sports');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/platform/sports" className="text-sm text-muted-foreground hover:underline">← Sports</Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Create sport</h1>
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
            <p className="text-sm text-muted-foreground">Each item: name, gender (BOYS|GIRLS|MIXED|OPEN), eligibility (object), optional matchFormat (SINGLES|DOUBLES|MIXED_DOUBLES)</p>
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
            <CardTitle>Optional: teamConfigJson (JSON object)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder='e.g. {"minPlayers": 11, "maxPlayers": 15}'
              value={teamConfigJson}
              onChange={(e) => setTeamConfigJson(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Optional: matchConfigJson (JSON object)</CardTitle>
            <p className="text-sm text-muted-foreground">e.g. SIMPLE_POINTS: halves, halfMinutes; SETS: bestOfSets, setPoints; CRICKET_LITE: oversPerInnings, ballPerOver</p>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder='e.g. {"halves": 2, "halfMinutes": 45}'
              value={matchConfigJson}
              onChange={(e) => setMatchConfigJson(e.target.value)}
            />
          </CardContent>
        </Card>
        {validationError && <p className="text-sm text-destructive mb-2">{validationError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>Create sport</Button>
          <Link href="/platform/sports"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}

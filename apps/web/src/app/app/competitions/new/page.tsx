'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  name: z.string().min(1),
  academicYear: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  venue: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCompetitionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    if (!tenantId) return;
    setSubmitError(null);
    const r = await apiPost<{ id: string }>(`/tenants/${tenantId}/competitions`, {
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    });
    if (!r.ok) {
      const details = r.error.details as Record<string, string[] | undefined> | undefined;
      const fieldMessages = details
        ? Object.entries(details)
            .flatMap(([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`))
            .join('. ')
        : '';
      setSubmitError(fieldMessages ? `${r.error.message}: ${fieldMessages}` : r.error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'competitions'] });
    router.push('/app/competitions');
  }

  if (!tenantId) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">New competition</h1>
      <Card className="max-w-md">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
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
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

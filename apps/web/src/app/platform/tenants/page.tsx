'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Tenant = { id: string; name: string; city: string; state: string; logoUrl?: string; createdAt: string };
type ListRes = { data: Tenant[]; nextCursor: string | null };

const createSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

type CreateForm = z.infer<typeof createSchema>;

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'tenants', cursor],
    queryFn: async () => assertOk(await apiGet<ListRes>('/platform/tenants', cursor ? { cursor } : undefined)),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  async function onCreate(data: CreateForm) {
    assertOk(await apiPost<Tenant>('/platform/tenants', {
      name: data.name,
      city: data.city,
      state: data.state,
      logoUrl: data.logoUrl || undefined,
    }));
    queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    setCreateOpen(false);
    reset();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tenants (Schools)</h1>
        <Button onClick={() => setCreateOpen(!createOpen)}>{createOpen ? 'Cancel' : 'Add tenant'}</Button>
      </div>
      {createOpen && (
        <Card className="mb-4">
          <CardHeader><CardTitle>New tenant</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4 max-w-md">
              <div>
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>City</Label>
                <Input {...register('city')} />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div>
                <Label>State</Label>
                <Input {...register('state')} />
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
              </div>
              <div>
                <Label>Logo URL (optional)</Label>
                <Input {...register('logoUrl')} />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {isLoading && <p>Loading...</p>}
      {data?.data && (
        <div className="space-y-2">
          {data.data.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.city}, {t.state}</p>
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

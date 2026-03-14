'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet, apiPatch, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TenantProfile = {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  country: string | null;
  logoUrl: string | null;
  certificateConfig: { signatureLabels: string[] };
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

const DEFAULT_SIGNATURE_LABELS = ['Principal', 'Sports Teacher'];

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [signatureLabels, setSignatureLabels] = useState<string[]>(DEFAULT_SIGNATURE_LABELS);

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => assertOk(await apiGet<TenantProfile>(`/tenants/${tenantId}`)),
    enabled: !!tenantId,
    retry: 1,
  });

  const patchMutation = useMutation({
    mutationFn: async (body: { name?: string; city?: string; state?: string; country?: string | null; logoUrl?: string | null; certificateConfig?: { signatureLabels: string[] } }) =>
      assertOk(await apiPatch<TenantProfile>(`/tenants/${tenantId}`, body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] }),
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setCity(profile.city);
    setState(profile.state);
    setCountry(profile.country ?? '');
    setSignatureLabels(profile.certificateConfig?.signatureLabels?.length ? profile.certificateConfig.signatureLabels : DEFAULT_SIGNATURE_LABELS);
  }, [profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    patchMutation.mutate({ name, city, state, country: country || null });
  };

  const handleSaveCertificateConfig = () => {
    patchMutation.mutate({ certificateConfig: { signatureLabels } });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    const formData = new FormData();
    formData.set('logo', file);
    const res = await fetch('/api/upload/tenant-logo', { method: 'POST', body: formData });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json.error ?? 'Upload failed');
      return;
    }
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = base + json.url;
    patchMutation.mutate({ logoUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addSignatureLabel = () => setSignatureLabels((prev) => [...prev, '']);
  const setSignatureLabelAt = (i: number, value: string) =>
    setSignatureLabels((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  const removeSignatureLabel = (i: number) =>
    setSignatureLabels((prev) => prev.filter((_, j) => j !== i));

  if (sessionStatus === 'loading') return <p className="p-4">Loading...</p>;
  if (sessionStatus === 'unauthenticated') return <p className="p-4">Please sign in.</p>;
  if (!tenantId) return <p className="p-4">You don’t have access to a school profile. Only school admins and coordinators can view this page.</p>;
  if (isError) {
    const msg = error instanceof Error ? error.message : 'Could not load profile.';
    return (
      <div className="p-4 space-y-2">
        <p className="text-destructive">{msg}</p>
        <p className="text-sm text-muted-foreground">Make sure the API is running and try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }
  if (isLoading && !profile) return <p className="p-4">Loading profile...</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">School profile</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">School details</CardTitle>
          <p className="text-sm text-muted-foreground">Name, location, and logo used on certificates.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>School name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <Label>Country (optional)</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>School logo</Label>
              <p className="text-xs text-muted-foreground mb-2">Used on certificates. JPEG, PNG, GIF or WebP, max 2MB.</p>
              <div className="flex items-center gap-4">
                {profile?.logoUrl && (
                  <img src={profile.logoUrl} alt="School logo" className="h-16 w-auto object-contain border rounded" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleLogoChange}
                  className="text-sm"
                />
              </div>
            </div>
            <Button type="submit" disabled={patchMutation.isPending}>
              {patchMutation.isPending ? 'Saving...' : 'Save school details'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate design</CardTitle>
          <p className="text-sm text-muted-foreground">Who signs the certificates (e.g. Principal, Sports Teacher). Order is left to right on the certificate.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Signature lines</Label>
            <div className="space-y-2 mt-2">
              {signatureLabels.map((label, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={label}
                    onChange={(e) => setSignatureLabelAt(i, e.target.value)}
                    placeholder="e.g. Principal"
                    className="max-w-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSignatureLabel(i)} disabled={signatureLabels.length <= 1}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSignatureLabel} disabled={signatureLabels.length >= 4}>
                Add signature line
              </Button>
            </div>
          </div>
          <Button onClick={handleSaveCertificateConfig} disabled={patchMutation.isPending}>
            {patchMutation.isPending ? 'Saving...' : 'Save certificate design'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

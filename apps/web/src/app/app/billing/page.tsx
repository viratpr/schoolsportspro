'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Entitlements = {
  plan: string;
  isProActive: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Free trial',
  PRO: 'Pro',
  TOURNAMENT_PASS: 'Tournament Pass',
  ANNUAL_PRO: 'Annual Pro',
};

function assertOk<T>(r: ApiResult<T>): T {
  if (!r.ok) throw new ApiClientError(r.error.message, r.error.statusCode, r.error.code, r.error.details);
  return r.data;
}

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      order_id: string;
      currency: string;
      name: string;
      description?: string;
      prefill?: { email?: string; name?: string };
      handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
    }) => { open: () => void };
  }
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: ent } = useQuery({
    queryKey: ['tenants', tenantId, 'entitlements'],
    queryFn: async () => assertOk(await apiGet<Entitlements>(`/tenants/${tenantId}/entitlements`)),
    enabled: !!tenantId,
  });

  const handlePay = useCallback(
    async (plan: 'TOURNAMENT_PASS' | 'ANNUAL_PRO') => {
      if (!tenantId) return;
      setLoadingPlan(plan);
      try {
        const createRes = await fetch('/api/billing/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) {
          alert(createJson.error ?? 'Failed to create order');
          return;
        }
        const { orderId, amount, currency, keyId } = createJson;
        const user = session?.user as { name?: string; email?: string } | undefined;
        const loadScript = (): Promise<void> =>
          new Promise((resolve) => {
            if (window.Razorpay) {
              resolve();
              return;
            }
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = () => resolve();
            document.head.appendChild(s);
          });
        await loadScript();
        if (!window.Razorpay) {
          alert('Payment script failed to load');
          return;
        }
        const rp = new window.Razorpay({
          key: keyId,
          amount,
          order_id: orderId,
          currency,
          name: 'Athletic Bharat',
          description: plan === 'TOURNAMENT_PASS' ? 'Tournament Pass (3 months)' : 'Annual Pro (12 months)',
          prefill: { email: user?.email ?? undefined, name: user?.name ?? undefined },
          handler: async (res) => {
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_order_id: res.razorpay_order_id,
                razorpay_signature: res.razorpay_signature,
                plan,
              }),
            });
            if (verifyRes.ok) {
              queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'entitlements'] });
              window.location.href = '/app/billing?success=1';
            } else {
              const err = await verifyRes.json().catch(() => ({}));
              alert(err.error ?? 'Payment verification failed');
            }
          },
        });
        rp.open();
      } finally {
        setLoadingPlan(null);
      }
    },
    [tenantId, session?.user, queryClient]
  );

  const planLabel = ent?.plan ? PLAN_LABELS[ent.plan] ?? ent.plan : '—';
  const isPaid = ent?.isProActive ?? false;
  const showUpgrade = !isPaid;
  const success = searchParams.get('success') === '1';
  const canceled = searchParams.get('canceled') === '1';

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      {success && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">Payment successful. Your plan is now active.</p>
      )}
      {canceled && <p className="mb-4 text-sm text-muted-foreground">Payment was canceled.</p>}
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            {planLabel} — {isPaid ? 'Certificate generation, all sports, and more.' : 'Free trial — up to 2 sports per competition.'}
          </p>
          {ent?.currentPeriodEnd && isPaid && (
            <p className="text-xs text-muted-foreground mt-1">Access until: {new Date(ent.currentPeriodEnd).toLocaleDateString()}</p>
          )}
          {ent?.trialEndsAt && !isPaid && (
            <p className="text-sm mt-1">Trial ends: {new Date(ent.trialEndsAt).toLocaleDateString()}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpgrade && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handlePay('TOURNAMENT_PASS')} disabled={!!loadingPlan}>
                {loadingPlan === 'TOURNAMENT_PASS' ? 'Opening…' : 'Get Tournament Pass (₹4,999 / 3 months)'}
              </Button>
              <Button onClick={() => handlePay('ANNUAL_PRO')} disabled={!!loadingPlan}>
                {loadingPlan === 'ANNUAL_PRO' ? 'Opening…' : 'Get Annual Pro (₹9,999 / 12 months)'}
              </Button>
            </div>
          )}
          {isPaid && (
            <p className="text-sm text-muted-foreground">For billing help or to change plan, contact support.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

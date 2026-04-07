'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPlanPriceLabel, type BillingPlanKey } from '@/lib/billing-pricing';

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

/** Set on signup when user chooses Annual Pro; optional `?checkout=ANNUAL_PRO` on this page. */
const BILLING_CHECKOUT_KEY = 'billing_open_checkout';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const autoCheckoutStarted = useRef(false);

  const { data: ent } = useQuery({
    queryKey: ['tenants', tenantId, 'entitlements'],
    queryFn: async () => assertOk(await apiGet<Entitlements>(`/tenants/${tenantId}/entitlements`)),
    enabled: !!tenantId,
  });

  const handlePay = useCallback(
    async (plan: BillingPlanKey) => {
      if (!tenantId) return;
      setLoadingPlan(plan);
      try {
        const createResult = await apiPost<{ url: string; sessionId: string; plan: string }>(
          '/billing/stripe/checkout-session',
          { plan }
        );
        if (!createResult.ok) {
          alert(createResult.error.message ?? 'Unable to start checkout');
          return;
        }
        window.location.href = createResult.data.url;
      } finally {
        setLoadingPlan(null);
      }
    },
    [tenantId]
  );

  useEffect(() => {
    if (!tenantId || autoCheckoutStarted.current) return;

    const fromStorage =
      typeof window !== 'undefined' && sessionStorage.getItem(BILLING_CHECKOUT_KEY) === 'ANNUAL_PRO';
    const fromQuery = searchParams.get('checkout') === 'ANNUAL_PRO';
    if (!fromStorage && !fromQuery) return;

    autoCheckoutStarted.current = true;
    if (fromStorage) sessionStorage.removeItem(BILLING_CHECKOUT_KEY);
    if (fromQuery) router.replace('/app/billing', { scroll: false });

    void handlePay('ANNUAL_PRO');
  }, [tenantId, searchParams, handlePay, router]);

  const planLabel = ent?.plan ? PLAN_LABELS[ent.plan] ?? ent.plan : '—';
  const isPaid = ent?.isProActive ?? false;
  const showUpgrade = !isPaid;
  const success = searchParams.get('success') === '1';
  const canceled = searchParams.get('canceled') === '1';

  const handleManageBilling = useCallback(async () => {
    setOpeningPortal(true);
    try {
      const result = await apiPost<{ url: string }>('/billing/stripe/portal-session');
      if (!result.ok) {
        alert(result.error.message ?? 'Unable to open billing portal');
        return;
      }
      window.location.href = result.data.url;
    } finally {
      setOpeningPortal(false);
    }
  }, []);

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">Billing</h1>
      {success && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">Payment successful. Your subscription is now active.</p>
      )}
      {canceled && <p className="mb-4 text-sm text-muted-foreground">Checkout was canceled.</p>}
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
                {loadingPlan === 'TOURNAMENT_PASS' ? 'Opening…' : `Get Tournament Pass (${formatPlanPriceLabel('TOURNAMENT_PASS')})`}
              </Button>
              <Button onClick={() => handlePay('ANNUAL_PRO')} disabled={!!loadingPlan}>
                {loadingPlan === 'ANNUAL_PRO' ? 'Opening…' : `Get Annual Pro (${formatPlanPriceLabel('ANNUAL_PRO')})`}
              </Button>
            </div>
          )}
          {isPaid && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleManageBilling} disabled={openingPortal}>
                {openingPortal ? 'Opening portal...' : 'Manage billing'}
              </Button>
              <p className="text-sm text-muted-foreground self-center">
                Open the Stripe customer portal to update payment method or cancel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

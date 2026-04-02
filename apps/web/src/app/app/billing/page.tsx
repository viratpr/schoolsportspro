'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost, ApiClientError, ApiResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPriceInclGstLabel, PLAN_DETAILS, type BillingPlanKey } from '@/lib/billing-pricing';

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
      modal?: { ondismiss?: () => void };
      handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
    }) => { open: () => void };
  }
}

/** Set on signup when user chooses Annual Pro; optional `?checkout=ANNUAL_PRO` on this page. */
const BILLING_CHECKOUT_KEY = 'billing_open_checkout';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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
        const createResult = await apiPost<{
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          plan: string;
        }>('/billing/razorpay/create-order', { plan });
        if (!createResult.ok) {
          const err = createResult.error;
          let full = err.message;
          const det = err.details as
            | { hint?: string; razorpayEnvPresent?: Record<string, boolean> }
            | undefined;
          if (det?.hint) full += `\n\n${det.hint}`;
          if (det?.razorpayEnvPresent && typeof det.razorpayEnvPresent === 'object') {
            full += `\n\nEnv names detected (non-secret):\n${JSON.stringify(det.razorpayEnvPresent, null, 2)}`;
          }
          alert(full);
          return;
        }
        const { orderId, amount, currency, keyId } = createResult.data;
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
          description: PLAN_DETAILS[plan].checkoutDescription,
          prefill: { email: user?.email ?? undefined, name: user?.name ?? undefined },
          modal: {
            ondismiss: () => setLoadingPlan(null),
          },
          handler: async (res) => {
            const verifyResult = await apiPost<{ success: boolean }>('/billing/razorpay/verify', {
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_signature: res.razorpay_signature,
              plan,
            });
            if (verifyResult.ok) {
              queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'entitlements'] });
              window.location.href = '/app/billing?success=1';
            } else {
              alert(verifyResult.error.message ?? 'Payment verification failed');
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
                {loadingPlan === 'TOURNAMENT_PASS' ? 'Opening…' : `Get Tournament Pass (${formatPriceInclGstLabel('TOURNAMENT_PASS')})`}
              </Button>
              <Button onClick={() => handlePay('ANNUAL_PRO')} disabled={!!loadingPlan}>
                {loadingPlan === 'ANNUAL_PRO' ? 'Opening…' : `Get Annual Pro (${formatPriceInclGstLabel('ANNUAL_PRO')})`}
              </Button>
            </div>
          )}
          {isPaid && (
            <p className="text-sm text-muted-foreground">For billing help or to change plan, contact support.</p>
          )}
          {process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL ? (
            <p className="text-xs text-muted-foreground border-t pt-4 mt-4">
              Payments are processed by Razorpay. Public payment page:{' '}
              <a
                href={process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_PAGE_URL.replace(/^https?:\/\//, '')}
              </a>
              . Use the upgrade buttons above so your payment is linked to this school account.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

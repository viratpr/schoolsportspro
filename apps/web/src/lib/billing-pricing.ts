/** Base catalog prices in USD cents. */

export const PLAN_DETAILS = {
  TOURNAMENT_PASS: {
    baseCents: 49900,
    months: 3,
    checkoutDescription: 'Tournament Pass (3 months)',
  },
  ANNUAL_PRO: {
    baseCents: 99900,
    months: 12,
    checkoutDescription: 'Annual Pro (12 months)',
  },
} as const;

export type BillingPlanKey = keyof typeof PLAN_DETAILS;

export function centsForPlan(plan: BillingPlanKey): number {
  return PLAN_DETAILS[plan].baseCents;
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPlanPriceLabel(plan: BillingPlanKey): string {
  return formatUsdFromCents(centsForPlan(plan));
}

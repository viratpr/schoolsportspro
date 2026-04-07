/** Base catalog prices in USD cents. Keep in sync with apps/web/src/lib/billing-pricing.ts. */

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

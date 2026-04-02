/**
 * Base catalog prices (excl. GST). Customer pays base × (1 + GST_RATE), rounded to the nearest paisa.
 * Razorpay Orders use the GST-inclusive amount.
 *
 * Keep in sync with apps/web/src/lib/billing-pricing.ts
 */
export const GST_RATE = 0.18;

export const PLAN_DETAILS = {
  TOURNAMENT_PASS: {
    basePaise: 499900,
    months: 3,
    checkoutDescription: 'Tournament Pass (3 months), incl. 18% GST',
  },
  ANNUAL_PRO: {
    basePaise: 999900,
    months: 12,
    checkoutDescription: 'Annual Pro (12 months), incl. 18% GST',
  },
} as const;

export type BillingPlanKey = keyof typeof PLAN_DETAILS;

export function inclusiveAmountPaiseFromBase(basePaise: number): number {
  return Math.round(basePaise * (1 + GST_RATE));
}

export function inclusivePaiseForPlan(plan: BillingPlanKey): number {
  return inclusiveAmountPaiseFromBase(PLAN_DETAILS[plan].basePaise);
}

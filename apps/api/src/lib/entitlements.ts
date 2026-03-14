import { prisma } from './prisma.js';

const PAID_PLANS = ['PRO', 'TOURNAMENT_PASS', 'ANNUAL_PRO'] as const;

export type Entitlements = {
  sportsEnabledLimit: number;
  canUseAllSports: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  isProActive: boolean;
  plan: string;
  currentPeriodEnd: Date | null;
};

export async function getTenantEntitlements(tenantId: string): Promise<Entitlements> {
  const [settings, subscription] = await Promise.all([
    prisma.tenantSettings.findUnique({ where: { tenantId } }),
    prisma.tenantSubscription.findUnique({ where: { tenantId } }),
  ]);
  const limit = settings?.sportsLimitTrial ?? 2;
  const plan = subscription?.plan ?? 'TRIAL';
  const status = subscription?.status ?? 'TRIALING';
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;
  const now = new Date();
  const periodValid = !currentPeriodEnd || currentPeriodEnd > now;
  const isPaidPlan = PAID_PLANS.includes(plan as (typeof PAID_PLANS)[number]);
  const isProActive = isPaidPlan && periodValid && (status === 'ACTIVE' || status === 'TRIALING');
  const isTrial = plan === 'TRIAL' && status === 'TRIALING';
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const canUseAllSports = isProActive;

  return {
    sportsEnabledLimit: limit,
    canUseAllSports,
    isTrial,
    trialEndsAt,
    isProActive,
    plan,
    currentPeriodEnd,
  };
}

/** Returns current count of enabled sports for a given competition. */
export async function getEnabledSportsCountForCompetition(tenantId: string, competitionId: string): Promise<number> {
  const count = await prisma.competitionSport.count({
    where: { tenantId, competitionId, enabled: true },
  });
  return count;
}

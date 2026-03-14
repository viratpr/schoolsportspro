-- AlterEnum: add TOURNAMENT_PASS and ANNUAL_PRO to SubscriptionPlan
ALTER TYPE "SubscriptionPlan" ADD VALUE 'TOURNAMENT_PASS';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'ANNUAL_PRO';

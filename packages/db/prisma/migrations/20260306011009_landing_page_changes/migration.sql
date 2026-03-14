/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'TRIALING');

-- CreateEnum
CREATE TYPE "MatchScorecardStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterEnum
ALTER TYPE "ScoringModel" ADD VALUE 'ATTEMPTS_BEST_OF';

-- AlterTable
ALTER TABLE "CompetitionSport" ADD COLUMN     "templateSnapshotJson" JSONB,
ADD COLUMN     "templateVersion" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "winnerTeamId" TEXT;

-- AlterTable
ALTER TABLE "Sport" ADD COLUMN     "scorecardTemplateJson" JSONB,
ADD COLUMN     "templateVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "country" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sportsLimitTrial" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchScorecard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "MatchScorecardStatus" NOT NULL DEFAULT 'DRAFT',
    "payloadJson" JSONB NOT NULL,
    "computedJson" JSONB,
    "summaryA" TEXT NOT NULL DEFAULT '',
    "summaryB" TEXT NOT NULL DEFAULT '',
    "winnerTeamId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStatLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT,
    "playerName" TEXT,
    "statsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_stripeCustomerId_idx" ON "TenantSubscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchScorecard_matchId_key" ON "MatchScorecard"("matchId");

-- CreateIndex
CREATE INDEX "MatchScorecard_tenantId_matchId_idx" ON "MatchScorecard"("tenantId", "matchId");

-- CreateIndex
CREATE INDEX "MatchScorecard_tenantId_winnerTeamId_idx" ON "MatchScorecard"("tenantId", "winnerTeamId");

-- CreateIndex
CREATE INDEX "PlayerStatLine_tenantId_matchId_idx" ON "PlayerStatLine"("tenantId", "matchId");

-- CreateIndex
CREATE INDEX "PlayerStatLine_tenantId_teamId_idx" ON "PlayerStatLine"("tenantId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatLine_matchId_teamId_studentId_key" ON "PlayerStatLine"("matchId", "teamId", "studentId");

-- CreateIndex
CREATE INDEX "Match_tenantId_winnerTeamId_idx" ON "Match"("tenantId", "winnerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchScorecard" ADD CONSTRAINT "MatchScorecard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatLine" ADD CONSTRAINT "PlayerStatLine_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

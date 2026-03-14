-- CreateEnum
CREATE TYPE "CricketMatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'TBD', 'NO_RESULT', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CricketResultType" AS ENUM ('NORMAL', 'TIE', 'NO_RESULT', 'TBD');

-- CreateEnum
CREATE TYPE "TossDecision" AS ENUM ('BAT', 'BOWL');

-- CreateEnum
CREATE TYPE "WicketType" AS ENUM ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT', 'OBSTRUCTING_FIELD', 'HANDLED_BALL', 'HIT_BALL_TWICE', 'TIMED_OUT');

-- CreateTable
CREATE TABLE "CricketMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "matchId" TEXT,
    "oversLimit" INTEGER NOT NULL,
    "ballsPerOver" INTEGER NOT NULL DEFAULT 6,
    "tossWinnerTeamId" TEXT NOT NULL,
    "tossDecision" "TossDecision" NOT NULL,
    "status" "CricketMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winnerTeamId" TEXT,
    "resultType" "CricketResultType" NOT NULL DEFAULT 'TBD',
    "notes" TEXT,
    "revisedTarget" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CricketMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CricketInnings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cricketMatchId" TEXT NOT NULL,
    "inningsNumber" INTEGER NOT NULL,
    "battingTeamId" TEXT NOT NULL,
    "bowlingTeamId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "legalBalls" INTEGER NOT NULL DEFAULT 0,
    "wides" INTEGER NOT NULL DEFAULT 0,
    "noBalls" INTEGER NOT NULL DEFAULT 0,
    "byes" INTEGER NOT NULL DEFAULT 0,
    "legByes" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "target" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CricketInnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CricketMatch_matchId_key" ON "CricketMatch"("matchId");

-- CreateIndex
CREATE INDEX "CricketMatch_tenantId_competitionId_idx" ON "CricketMatch"("tenantId", "competitionId");

-- CreateIndex
CREATE INDEX "CricketMatch_tenantId_categoryId_idx" ON "CricketMatch"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CricketInnings_cricketMatchId_inningsNumber_key" ON "CricketInnings"("cricketMatchId", "inningsNumber");

-- CreateIndex
CREATE INDEX "CricketInnings_tenantId_cricketMatchId_idx" ON "CricketInnings"("tenantId", "cricketMatchId");

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketMatch" ADD CONSTRAINT "CricketMatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketInnings" ADD CONSTRAINT "CricketInnings_cricketMatchId_fkey" FOREIGN KEY ("cricketMatchId") REFERENCES "CricketMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketInnings" ADD CONSTRAINT "CricketInnings_battingTeamId_fkey" FOREIGN KEY ("battingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CricketInnings" ADD CONSTRAINT "CricketInnings_bowlingTeamId_fkey" FOREIGN KEY ("bowlingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

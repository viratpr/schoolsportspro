-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ScoringModel" AS ENUM ('SIMPLE_POINTS', 'SETS', 'CRICKET_LITE', 'TIME_DISTANCE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'SCHOOL_ADMIN', 'COORDINATOR', 'COACH', 'VIEWER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('BOYS', 'GIRLS', 'MIXED', 'OPEN');

-- CreateEnum
CREATE TYPE "StudentGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CategoryFormat" AS ENUM ('KNOCKOUT', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'READY', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchResultMethod" AS ENUM ('NORMAL', 'BYE', 'WALKOVER', 'TIEBREAKER');

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportType" "SportType" NOT NULL,
    "scoringModel" "ScoringModel" NOT NULL,
    "defaultRulesText" TEXT NOT NULL,
    "defaultCategoryTemplatesJson" JSONB NOT NULL,
    "teamConfigJson" JSONB,
    "matchConfigJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "StudentGender" NOT NULL,
    "dob" TIMESTAMP(3),
    "classStandard" TEXT NOT NULL,
    "section" TEXT,
    "house" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionSport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "overriddenRulesText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitionSportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "eligibilityJson" JSONB NOT NULL,
    "format" "CategoryFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coachName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "venue" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "scoringModel" "ScoringModel" NOT NULL,
    "scorecardJson" JSONB NOT NULL,
    "summaryA" TEXT NOT NULL,
    "summaryB" TEXT NOT NULL,
    "numericScoreA" DOUBLE PRECISION,
    "numericScoreB" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "winnerTeamId" TEXT NOT NULL,
    "method" "MatchResultMethod" NOT NULL,
    "notes" TEXT,
    "finalizedByUserId" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "participantEntryId" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION NOT NULL,
    "displayValue" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryStats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "totalTeams" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "completedMatches" INTEGER NOT NULL DEFAULT 0,
    "championTeamId" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Student_tenantId_classStandard_section_idx" ON "Student"("tenantId", "classStandard", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Student_tenantId_admissionNo_key" ON "Student"("tenantId", "admissionNo");

-- CreateIndex
CREATE INDEX "Competition_tenantId_academicYear_idx" ON "Competition"("tenantId", "academicYear");

-- CreateIndex
CREATE INDEX "CompetitionSport_tenantId_competitionId_idx" ON "CompetitionSport"("tenantId", "competitionId");

-- CreateIndex
CREATE INDEX "Category_tenantId_competitionSportId_idx" ON "Category"("tenantId", "competitionSportId");

-- CreateIndex
CREATE INDEX "Team_tenantId_categoryId_idx" ON "Team"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tenantId_categoryId_name_key" ON "Team"("tenantId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_tenantId_teamId_idx" ON "TeamMember"("tenantId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_studentId_key" ON "TeamMember"("teamId", "studentId");

-- CreateIndex
CREATE INDEX "Match_tenantId_categoryId_roundNumber_idx" ON "Match"("tenantId", "categoryId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Match_categoryId_roundNumber_matchNumber_key" ON "Match"("categoryId", "roundNumber", "matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_matchId_key" ON "Scorecard"("matchId");

-- CreateIndex
CREATE INDEX "Scorecard_tenantId_matchId_idx" ON "Scorecard"("tenantId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_matchId_key" ON "MatchResult"("matchId");

-- CreateIndex
CREATE INDEX "MatchResult_tenantId_winnerTeamId_idx" ON "MatchResult"("tenantId", "winnerTeamId");

-- CreateIndex
CREATE INDEX "ParticipantEntry_tenantId_categoryId_idx" ON "ParticipantEntry"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantEntry_categoryId_studentId_key" ON "ParticipantEntry"("categoryId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "IndividualResult_participantEntryId_key" ON "IndividualResult"("participantEntryId");

-- CreateIndex
CREATE INDEX "IndividualResult_tenantId_rank_idx" ON "IndividualResult"("tenantId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryStats_categoryId_key" ON "CategoryStats"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryStats_tenantId_categoryId_idx" ON "CategoryStats"("tenantId", "categoryId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSport" ADD CONSTRAINT "CompetitionSport_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSport" ADD CONSTRAINT "CompetitionSport_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_competitionSportId_fkey" FOREIGN KEY ("competitionSportId") REFERENCES "CompetitionSport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantEntry" ADD CONSTRAINT "ParticipantEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantEntry" ADD CONSTRAINT "ParticipantEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualResult" ADD CONSTRAINT "IndividualResult_participantEntryId_fkey" FOREIGN KEY ("participantEntryId") REFERENCES "ParticipantEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryStats" ADD CONSTRAINT "CategoryStats_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

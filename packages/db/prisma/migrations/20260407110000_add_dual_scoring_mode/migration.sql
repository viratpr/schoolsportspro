-- Create enum for competition sport scoring mode
CREATE TYPE "ScoringMode" AS ENUM ('SIMPLE', 'INTERNATIONAL');

-- Add international template metadata to sport library
ALTER TABLE "Sport"
ADD COLUMN "internationalTemplateJson" JSONB,
ADD COLUMN "hasInternationalRules" BOOLEAN NOT NULL DEFAULT false;

-- Track selected scoring mode at competition-sport snapshot level
ALTER TABLE "CompetitionSport"
ADD COLUMN "scoringMode" "ScoringMode" NOT NULL DEFAULT 'SIMPLE';

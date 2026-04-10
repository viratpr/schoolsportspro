-- Run after `pnpm db:baseline` when the DB was actually behind: applies DDL from
-- 20260407110000_add_dual_scoring_mode and 20260410120000_user_password_hash_optional
-- idempotently (safe to run more than once).

DO $$
BEGIN
  CREATE TYPE "ScoringMode" AS ENUM ('SIMPLE', 'INTERNATIONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Sport" ADD COLUMN IF NOT EXISTS "internationalTemplateJson" JSONB;
ALTER TABLE "Sport" ADD COLUMN IF NOT EXISTS "hasInternationalRules" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CompetitionSport" ADD COLUMN IF NOT EXISTS "scoringMode" "ScoringMode" NOT NULL DEFAULT 'SIMPLE'::"ScoringMode";

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

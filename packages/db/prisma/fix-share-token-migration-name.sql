-- One-time fix: your DB applied this migration as "20250309..." but the file is now
-- "20260309..." so the shadow DB runs it in the correct order (after Competition exists).
-- Run this once, then run: pnpm db:migrate (or prisma migrate dev)
UPDATE "_prisma_migrations"
SET migration_name = '20260309000000_add_competition_share_token'
WHERE migration_name = '20250309000000_add_competition_share_token';

-- Run this only when pnpm db:migrate fails with P1002 (advisory lock timeout).
-- It terminates all other connections to the database so the next migrate can acquire the lock.
-- Then run: pnpm db:migrate
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND usename = current_user;

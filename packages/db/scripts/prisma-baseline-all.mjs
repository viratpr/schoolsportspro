/**
 * Marks every folder in prisma/migrations as already applied (does not run SQL).
 * Use only when your database schema already matches the repo migrations, but
 * _prisma_migrations was never populated (P3005 on first migrate deploy).
 *
 * If your DB is missing columns/tables, do NOT run this—fix schema first (e.g.
 * prisma migrate diff + run SQL, or start from a fresh database + migrate deploy).
 *
 * If you already baselined by mistake and seed fails (e.g. missing internationalTemplateJson),
 * run: pnpm db:repair-drift  then  pnpm db:seed
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbRoot = path.resolve(__dirname, '..');
const migrationsRoot = path.join(dbRoot, 'prisma', 'migrations');

const dirs = readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

console.warn(
  '\n[prisma:baseline] This will run: prisma migrate resolve --applied <name> for each migration.\n' +
    'It does not change tables. If the DB is behind the repo, run SQL fixes first.\n'
);

for (const name of dirs) {
  console.log(`\n→ resolve --applied "${name}"`);
  const r = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'resolve', '--applied', name], {
    cwd: dbRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\n[prisma:baseline] Done. Next: pnpm db:migrate:deploy (should apply 0) && pnpm db:seed\n');

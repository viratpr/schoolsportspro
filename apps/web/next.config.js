const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const repoRoot = path.join(__dirname, '../..');

/** Load dotenv the same way Next does; resolves `@next/env` from the `next` install (pnpm-safe). */
function loadRootEnvWithNext() {
  try {
    const req = createRequire(require.resolve('next/package.json'));
    const { loadEnvConfig } = req('@next/env');
    loadEnvConfig(repoRoot);
  } catch (err) {
    console.warn(
      '[next.config] loadEnvConfig failed; using manual root .env parse:',
      err && err.message
    );
  }
}

/** @param {string} envPath */
function mergeEnvFileIntoProcess(envPath) {
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Monorepo: API uses repo root `../../.env`; Next only auto-loads `apps/web/.env*` by default.
// Pull root env for shared keys (e.g. one `.env` for JWT / NEXTAUTH in local dev).
loadRootEnvWithNext();
// Backfill any keys still missing (covers silent failures and edge cases).
mergeEnvFileIntoProcess(path.join(repoRoot, '.env'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: trace Prisma / hoisted deps from repo root so Vercel bundles query engines.
  outputFileTracingRoot: repoRoot,
  // Do not webpack-bundle Prisma; avoids missing libquery_engine-* on serverless (see pris.ly/d/engine-not-found-nextjs).
  serverExternalPackages: ['@prisma/client'],
  transpilePackages: ['@bharatathlete/api'],
  /** API package uses NodeNext `.js` specifiers in TS sources; map them for webpack. */
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js', '.tsx', '.jsx'],
    };
    return config;
  },
  // Do not use `env` to inject NEXTAUTH_* here: that inlines values at **build** time, so production
  // images built without NEXTAUTH_URL would bake `localhost` into the client bundle and break
  // signOut redirects. It would also expose NEXTAUTH_SECRET to browser JS. Read real env at runtime
  // only (see ECS/task env, local shell, or apps/web/.env for dev).
};

module.exports = nextConfig;

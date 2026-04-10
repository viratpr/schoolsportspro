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

/** Paths relative to apps/web for Next output file tracing (pnpm: engines live under .pnpm). */
function prismaTracingIncludeGlobs() {
  try {
    const webRequire = createRequire(path.join(__dirname, 'package.json'));
    const clientPkg = webRequire.resolve('@prisma/client/package.json');
    const clientDir = path.dirname(clientPkg);
    const enginesDir = path.join(clientDir, '..', '.prisma', 'client');
    const rel = (abs) => path.relative(__dirname, abs).split(path.sep).join('/');
    return [`${rel(clientDir)}/**/*`, `${rel(enginesDir)}/**/*`];
  } catch (e) {
    console.warn('[next.config] prismaTracingIncludeGlobs fallback:', e && e.message);
    return [
      '../../node_modules/.pnpm/**/node_modules/.prisma/client/**/*',
      '../../node_modules/.pnpm/**/node_modules/@prisma/client/**/*',
    ];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14.2: tracing + externals live under experimental (top-level keys are ignored).
  experimental: {
    outputFileTracingRoot: repoRoot,
    outputFileTracingIncludes: {
      '/api/**/*': prismaTracingIncludeGlobs(),
    },
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  transpilePackages: ['@bharatathlete/api'],
  /** API package uses NodeNext `.js` specifiers in TS sources; map them for webpack. */
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js', '.tsx', '.jsx'],
    };
    if (isServer) {
      const prismaExternal = ({ request }, callback) => {
        if (
          request === '@prisma/client' ||
          (typeof request === 'string' && request.startsWith('@prisma/client/'))
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      };
      const prev = config.externals;
      if (Array.isArray(prev)) {
        config.externals = [...prev, prismaExternal];
      } else if (typeof prev === 'function') {
        config.externals = [prev, prismaExternal];
      } else {
        config.externals = prismaExternal;
      }
    }
    return config;
  },
  // Do not use `env` to inject NEXTAUTH_* here: that inlines values at **build** time, so production
  // images built without NEXTAUTH_URL would bake `localhost` into the client bundle and break
  // signOut redirects. It would also expose NEXTAUTH_SECRET to browser JS. Read real env at runtime
  // only (see ECS/task env, local shell, or apps/web/.env for dev).
};

module.exports = nextConfig;

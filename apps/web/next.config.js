/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // NextAuth: avoid NEXTAUTH_URL / NO_SECRET warnings and login failures (set in .env or apps/web/.env to override)
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  },
};

module.exports = nextConfig;

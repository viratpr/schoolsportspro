FROM node:22-alpine
RUN corepack enable pnpm
WORKDIR /app

# Install deps (cached unless manifests change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

# Generate Prisma client
COPY packages/db packages/db
RUN pnpm --filter @bharatathlete/db run prisma:generate

# Build API
COPY apps/api apps/api
RUN pnpm --filter @bharatathlete/api build

EXPOSE 3001
# prisma migrate deploy is the production-safe, non-interactive migration command
CMD ["sh", "-c", "pnpm --filter @bharatathlete/db exec prisma migrate deploy && node apps/api/dist/server.js"]

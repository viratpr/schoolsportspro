FROM node:22-alpine
RUN corepack enable pnpm
WORKDIR /app

# Install deps (cached unless manifests change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

# Generate Prisma client
COPY packages/db packages/db
RUN pnpm --filter @bharatathlete/db run prisma:generate

# Bake the public API URL into the client-side JS bundle (browser calls go to localhost)
# The runtime NEXT_PUBLIC_API_URL env var in docker-compose overrides this for server-side code (e.g. NextAuth)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY apps/web apps/web
# Razorpay/DB secrets are not available here by design — `next build` must not require them.
# Pass RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (and optional NEXT_PUBLIC_RAZORPAY_KEY_ID) at `docker run` / compose.
RUN pnpm --filter @bharatathlete/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@bharatathlete/web", "start"]

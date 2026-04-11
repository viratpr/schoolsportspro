import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

/** Reuse one client per warm serverless isolate (Vercel + Fastify); avoids extra pool churn in production. */
globalForPrisma.prisma = prisma;

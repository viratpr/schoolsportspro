import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import { AppError } from './lib/errors.js';
import authRoutes from './routes/auth.js';
import platformRoutes from './routes/platform.js';
import studentsRoutes from './routes/students.js';
import competitionsRoutes from './routes/competitions.js';
import competitionSportsRoutes from './routes/competition-sports.js';
import entitlementsRoutes from './routes/entitlements.js';
import categoriesRoutes from './routes/categories.js';
import matchesRoutes from './routes/matches.js';
import templateScorecardRoutes from './routes/template-scorecard.js';
import cricketRoutes from './routes/cricket.js';
import publicRoutes from './routes/public.js';
import tenantProfileRoutes from './routes/tenant-profile.js';
import dashboardRoutes from './routes/dashboard.js';
import { ZodError } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';

const app = Fastify({ logger: true });

app.setErrorHandler((err, request, reply) => {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: err.message,
      code: err.code,
    });
  }
  if (err instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
  }
  request.log.error(err);
  return reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

await app.register(cors, { origin: true });
await app.register(fjwt, { secret: JWT_SECRET });

await app.register(authRoutes);
await app.register(platformRoutes);
await app.register(studentsRoutes);
await app.register(competitionsRoutes);
await app.register(competitionSportsRoutes);
await app.register(entitlementsRoutes);
await app.register(categoriesRoutes);
await app.register(matchesRoutes);
await app.register(templateScorecardRoutes);
await app.register(cricketRoutes);
await app.register(publicRoutes);
await app.register(tenantProfileRoutes);
await app.register(dashboardRoutes);

app.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API listening on http://localhost:${port}`);

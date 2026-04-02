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
import billingRoutes from './routes/billing.js';
import inventoryRoutes from './routes/inventory.js';
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
  const errAny = err as { code?: string; statusCode?: number };
  if (errAny.code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    return reply.status(400).send({
      error: 'Request body cannot be empty when Content-Type is application/json.',
      code: 'EMPTY_BODY',
    });
  }
  const errConstraint = err as { code?: string; message?: string; cause?: unknown };
  const code = errConstraint.code ?? (errConstraint.cause as { code?: string })?.code;
  const msg = errConstraint.message ?? (errConstraint.cause as { message?: string })?.message ?? '';
  const isConstraint =
    code === 'P2003' || /foreign key|constraint|P2003|unique constraint/i.test(msg) || (errConstraint.cause && (errConstraint.cause as { code?: string }).code === 'P2003');
  if (isConstraint) {
    return reply.status(409).send({
      error:
        'Cannot delete this student because they are assigned to teams or competition categories. Remove them from teams and categories first.',
      code: 'CONFLICT',
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
await app.register(billingRoutes);
await app.register(inventoryRoutes);

app.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API listening on http://localhost:${port}`);

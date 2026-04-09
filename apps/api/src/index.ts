import Fastify from 'fastify';
import { configureApp } from './app.js';

const app = Fastify({ logger: true });
await configureApp(app);

// Vercel (Fluid / serverless) owns the HTTP server; binding with listen() here can crash invocations.
// Locally and in Docker we listen as usual.
if (process.env.VERCEL) {
  await app.ready();
} else {
  const port = Number(process.env.PORT) || 3001;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API listening on http://localhost:${port}`);
}

export default app;

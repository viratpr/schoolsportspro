import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { configureApp } from './configure-app.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await configureApp(app);
  return app;
}

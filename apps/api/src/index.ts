import Fastify from 'fastify';
import { configureApp } from './app.js';

const app = Fastify({ logger: true });
await configureApp(app);

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`API listening on http://localhost:${port}`);

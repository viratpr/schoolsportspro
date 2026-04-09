/**
 * Default export for standalone Vercel deployments of this package (Fluid / serverless).
 * Single-project Next + API uses pages/api/rest instead.
 */
import { createApp } from './create-app.js';

const app = await createApp();
await app.ready();

export default app;

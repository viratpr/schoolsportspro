import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage, ServerResponse } from 'node:http';
import serverless from 'serverless-http';
import { createApp } from '@bharatathlete/api';

export const config = {
  api: {
    bodyParser: false,
  },
};

let handlerPromise: Promise<ReturnType<typeof serverless>> | null = null;

function getServerlessHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const app = await createApp();
      await app.ready();
      return serverless(app.server);
    })();
  }
  return handlerPromise;
}

/** Fastify routes expect paths like /auth/login; Next serves this handler under /api/rest. */
function stripApiRestPrefix(req: NextApiRequest) {
  const raw = req.url ?? '/';
  const q = raw.indexOf('?');
  const pathPart = q === -1 ? raw : raw.slice(0, q);
  const query = q === -1 ? '' : raw.slice(q);
  let newPath: string;
  if (pathPart === '/api/rest' || pathPart.startsWith('/api/rest/')) {
    const rest = pathPart.slice('/api/rest'.length);
    newPath = rest === '' || rest === '/' ? '/' : rest.startsWith('/') ? rest : `/${rest}`;
  } else {
    newPath = pathPart;
  }
  req.url = newPath + query;
}

export default async function restCatchAll(req: NextApiRequest, res: NextApiResponse) {
  stripApiRestPrefix(req);
  const h = await getServerlessHandler();
  return h(req as unknown as IncomingMessage, res as unknown as ServerResponse);
}

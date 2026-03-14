import type { FastifyInstance } from 'fastify';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import { getTenantEntitlements } from '../lib/entitlements.js';
import { Role } from '@bharatathlete/db';

export default async function entitlementsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/entitlements',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const ent = await getTenantEntitlements(tenantId);
      return reply.send({
        sportsEnabledLimit: ent.sportsEnabledLimit,
        canUseAllSports: ent.canUseAllSports,
        isTrial: ent.isTrial,
        trialEndsAt: ent.trialEndsAt?.toISOString() ?? null,
        isProActive: ent.isProActive,
        plan: ent.plan,
        currentPeriodEnd: ent.currentPeriodEnd?.toISOString() ?? null,
      });
    }
  );
}

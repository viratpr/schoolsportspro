import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import { tenantProfileUpdateSchema } from '../schemas/tenant-profile.js';
import { notFound } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';

const PROFILE_ROLES = [Role.SCHOOL_ADMIN, Role.COORDINATOR];

export default async function tenantProfileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  /** GET own tenant profile (name, slug, city, state, country, logoUrl, certificateConfig). */
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, PROFILE_ROLES);
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          country: true,
          logoUrl: true,
          settings: {
            select: { certificateConfigJson: true },
          },
        },
      });
      if (!tenant) throw notFound('Tenant not found');
      const settings = tenant.settings as { certificateConfigJson?: { signatureLabels?: string[] } } | null;
      return reply.send({
        ...tenant,
        settings: undefined,
        certificateConfig: settings?.certificateConfigJson ?? { signatureLabels: ['Principal', 'Sports Teacher'] },
      });
    }
  );

  /** PATCH own tenant profile and/or certificate config. */
  app.patch<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, PROFILE_ROLES);
      const body = tenantProfileUpdateSchema.parse(request.body);
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId },
        include: { settings: true },
      });
      if (!tenant) throw notFound('Tenant not found');

      const tenantData: { name?: string; city?: string; state?: string; country?: string | null; logoUrl?: string | null } = {};
      if (body.name !== undefined) tenantData.name = body.name;
      if (body.city !== undefined) tenantData.city = body.city;
      if (body.state !== undefined) tenantData.state = body.state;
      if (body.country !== undefined) tenantData.country = body.country;
      if (body.logoUrl !== undefined) tenantData.logoUrl = body.logoUrl;

      if (Object.keys(tenantData).length > 0) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: tenantData,
        });
      }

      if (body.certificateConfig !== undefined) {
        const payload = { signatureLabels: body.certificateConfig.signatureLabels };
        await prisma.tenantSettings.upsert({
          where: { tenantId },
          create: {
            tenantId,
            certificateConfigJson: payload as object,
          },
          update: {
            certificateConfigJson: payload as object,
          },
        });
      }

      const updated = await prisma.tenant.findFirst({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          country: true,
          logoUrl: true,
          settings: { select: { certificateConfigJson: true } },
        },
      });
      const settings = updated?.settings as { certificateConfigJson?: { signatureLabels?: string[] } } | null;
      return reply.send({
        ...updated,
        settings: undefined,
        certificateConfig: settings?.certificateConfigJson ?? { signatureLabels: ['Principal', 'Sports Teacher'] },
      });
    }
  );
}

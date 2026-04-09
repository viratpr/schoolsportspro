import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { logAudit } from '../lib/audit.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { tenantIdParam } from '../schemas/common.js';
import {
  createInventoryItemSchema,
  createInventoryLoanSchema,
  inventoryItemIdParam,
  inventoryLoanIdParam,
  inventoryLoansQuerySchema,
  patchInventoryItemSchema,
} from '../schemas/inventory.js';
import { badRequest, notFound } from '../lib/errors.js';
import { Role } from '@prisma/client';

const readRoles = [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER];
const mutateRoles = [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH];

function actorUserId(request: FastifyRequest): string | undefined {
  return (request as FastifyRequest & { user?: { userId: string } }).user?.userId;
}

async function openLoanQtyByItemId(tenantId: string): Promise<Map<string, number>> {
  const rows = await prisma.inventoryLoan.groupBy({
    by: ['itemId'],
    where: { tenantId, returnedAt: null },
    _sum: { quantity: true },
  });
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.itemId, r._sum.quantity ?? 0);
  }
  return m;
}

export default async function inventoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/inventory/summary',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, readRoles);

      const items = await prisma.inventoryItem.findMany({
        where: { tenantId },
        select: { id: true, category: true, quantityTotal: true, quantityDamaged: true },
      });
      const loanByItem = await openLoanQtyByItemId(tenantId);

      let usable = 0;
      let damaged = 0;
      let onLoan = 0;
      const catMap = new Map<string, { available: number; onLoan: number }>();

      for (const it of items) {
        const good = it.quantityTotal - it.quantityDamaged;
        usable += good;
        damaged += it.quantityDamaged;
        const ol = loanByItem.get(it.id) ?? 0;
        onLoan += ol;
        const avail = Math.max(0, it.quantityTotal - it.quantityDamaged - ol);
        const cur = catMap.get(it.category) ?? { available: 0, onLoan: 0 };
        cur.available += avail;
        cur.onLoan += ol;
        catMap.set(it.category, cur);
      }

      const byCategory = [...catMap.entries()].map(([category, v]) => ({
        category,
        available: v.available,
        onLoan: v.onLoan,
      }));

      return reply.send({ usable, onLoan, damaged, byCategory });
    }
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/inventory/items',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, readRoles);

      const items = await prisma.inventoryItem.findMany({
        where: { tenantId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      const loanByItem = await openLoanQtyByItemId(tenantId);
      const data = items.map((it) => {
        const onLoan = loanByItem.get(it.id) ?? 0;
        const quantityAvailable = Math.max(0, it.quantityTotal - it.quantityDamaged - onLoan);
        return {
          ...it,
          quantityOnLoan: onLoan,
          quantityAvailable,
        };
      });
      return reply.send({ data });
    }
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/inventory/items',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, mutateRoles);
      const body = createInventoryItemSchema.parse(request.body);
      if (body.quantityDamaged > body.quantityTotal) {
        throw badRequest('Damaged quantity cannot exceed total quantity', 'INVALID_QUANTITIES');
      }
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId,
          name: body.name,
          category: body.category,
          quantityTotal: body.quantityTotal,
          quantityDamaged: body.quantityDamaged,
        },
      });
      const uid = actorUserId(request);
      if (uid) {
        await logAudit(prisma, {
          tenantId,
          actorUserId: uid,
          action: 'INVENTORY_ITEM_CREATE',
          entityType: 'InventoryItem',
          entityId: item.id,
          metaJson: { name: item.name, category: item.category },
        });
      }
      return reply.status(201).send(item);
    }
  );

  app.patch<{ Params: { tenantId: string; itemId: string } }>(
    '/tenants/:tenantId/inventory/items/:itemId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { itemId } = inventoryItemIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, mutateRoles);
      const body = patchInventoryItemSchema.parse(request.body);

      const updated = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
        if (!item) throw notFound('Inventory item not found');
        const agg = await tx.inventoryLoan.aggregate({
          where: { itemId, returnedAt: null },
          _sum: { quantity: true },
        });
        const onLoan = agg._sum.quantity ?? 0;
        const nextTotal = body.quantityTotal ?? item.quantityTotal;
        const nextDamaged = body.quantityDamaged ?? item.quantityDamaged;
        if (nextDamaged > nextTotal) {
          throw badRequest('Damaged quantity cannot exceed total quantity', 'INVALID_QUANTITIES');
        }
        if (nextTotal - nextDamaged < onLoan) {
          throw badRequest(
            'Usable stock cannot be less than quantity currently issued on loan',
            'STOCK_BELOW_LOANS'
          );
        }
        return tx.inventoryItem.update({
          where: { id: itemId },
          data: {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.category !== undefined ? { category: body.category } : {}),
            ...(body.quantityTotal !== undefined ? { quantityTotal: body.quantityTotal } : {}),
            ...(body.quantityDamaged !== undefined ? { quantityDamaged: body.quantityDamaged } : {}),
          },
        });
      });

      if (updated.tenantId !== tenantId) throw notFound('Inventory item not found');
      return reply.send(updated);
    }
  );

  app.get<{ Params: { tenantId: string }; Querystring: Record<string, string | undefined> }>(
    '/tenants/:tenantId/inventory/loans',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, readRoles);
      const q = inventoryLoansQuerySchema.parse(request.query);
      const openOnly = q.open !== '0';

      const loans = await prisma.inventoryLoan.findMany({
        where: {
          tenantId,
          ...(openOnly ? { returnedAt: null } : {}),
        },
        include: {
          item: { select: { id: true, name: true, category: true } },
        },
        orderBy: [{ issuedAt: 'desc' }],
        take: 500,
      });
      return reply.send({ data: loans });
    }
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/inventory/loans',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, mutateRoles);
      const body = createInventoryLoanSchema.parse(request.body);
      const uid = actorUserId(request);

      const loan = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findFirst({
          where: { id: body.itemId, tenantId },
        });
        if (!item) throw notFound('Inventory item not found');

        if (body.studentId) {
          const st = await tx.student.findFirst({
            where: { id: body.studentId, tenantId },
          });
          if (!st) throw notFound('Student not found');
        }

        const agg = await tx.inventoryLoan.aggregate({
          where: { itemId: body.itemId, returnedAt: null },
          _sum: { quantity: true },
        });
        const onLoan = agg._sum.quantity ?? 0;
        const available = Math.max(0, item.quantityTotal - item.quantityDamaged - onLoan);
        if (body.quantity > available) {
          throw badRequest(
            `Only ${available} unit(s) available to issue`,
            'INSUFFICIENT_STOCK'
          );
        }

        return tx.inventoryLoan.create({
          data: {
            tenantId,
            itemId: body.itemId,
            quantity: body.quantity,
            borrowerName: body.borrowerName,
            classSection: body.classSection,
            studentId: body.studentId ?? null,
            issuedByUserId: uid ?? null,
          },
        });
      });

      if (uid) {
        await logAudit(prisma, {
          tenantId,
          actorUserId: uid,
          action: 'INVENTORY_LOAN_ISSUE',
          entityType: 'InventoryLoan',
          entityId: loan.id,
          metaJson: { itemId: loan.itemId, quantity: loan.quantity, borrowerName: loan.borrowerName },
        });
      }

      return reply.status(201).send(loan);
    }
  );

  app.post<{ Params: { tenantId: string; loanId: string } }>(
    '/tenants/:tenantId/inventory/loans/:loanId/return',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const { loanId } = inventoryLoanIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, mutateRoles);
      const uid = actorUserId(request);

      const updated = await prisma.$transaction(async (tx) => {
        const loan = await tx.inventoryLoan.findFirst({
          where: { id: loanId, tenantId },
        });
        if (!loan) throw notFound('Loan not found');
        if (loan.returnedAt) {
          throw badRequest('This issue has already been received back', 'ALREADY_RETURNED');
        }
        return tx.inventoryLoan.update({
          where: { id: loanId },
          data: { returnedAt: new Date() },
        });
      });

      if (uid) {
        await logAudit(prisma, {
          tenantId,
          actorUserId: uid,
          action: 'INVENTORY_LOAN_RETURN',
          entityType: 'InventoryLoan',
          entityId: loanId,
          metaJson: { itemId: updated.itemId, quantity: updated.quantity },
        });
      }

      return reply.send(updated);
    }
  );
}

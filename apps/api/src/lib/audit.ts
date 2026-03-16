import type { PrismaClient } from '@bharatathlete/db';

export type AuditParams = {
  tenantId: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metaJson?: Record<string, unknown> | null;
};

export async function logAudit(prisma: PrismaClient, params: AuditParams): Promise<void> {
  try {
    const db = prisma as PrismaClient & {
      auditLog: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
    };
    await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metaJson: params.metaJson ?? undefined,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}

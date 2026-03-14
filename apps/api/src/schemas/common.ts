import { z } from 'zod';

export const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Tenant IDs in this project are not guaranteed to be cuid strings
// (e.g. demo-tenant-001 in seed data), so we only require a non-empty string.
export const tenantIdParam = z.object({ tenantId: z.string().min(1) });
export const competitionIdParam = z.object({ competitionId: z.string().cuid() });
export const competitionSportIdParam = z.object({ competitionSportId: z.string().cuid() });
export const categoryIdParam = z.object({ categoryId: z.string().cuid() });
export const matchIdParam = z.object({ matchId: z.string().cuid() });

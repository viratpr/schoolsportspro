import { z } from 'zod';

export const inventoryItemIdParam = z.object({ itemId: z.string().min(1) });
export const inventoryLoanIdParam = z.object({ loanId: z.string().min(1) });

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(200),
  quantityTotal: z.coerce.number().int().min(0),
  quantityDamaged: z.coerce.number().int().min(0).optional().default(0),
});

export const patchInventoryItemSchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    category: z.string().min(1).max(200).optional(),
    quantityTotal: z.coerce.number().int().min(0).optional(),
    quantityDamaged: z.coerce.number().int().min(0).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

export const createInventoryLoanSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  borrowerName: z.string().min(1).max(500),
  classSection: z.string().min(1).max(200),
  studentId: z.string().min(1).optional().nullable(),
});

export const inventoryLoansQuerySchema = z.object({
  open: z.enum(['0', '1']).optional(),
});

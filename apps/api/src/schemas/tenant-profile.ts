import { z } from 'zod';

/** Schema for tenant profile update (school admin / coordinator updating own tenant). */
export const tenantProfileUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  country: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  /** Certificate design: signature labels and order (e.g. ["Principal", "Sports Teacher"]). */
  certificateConfig: z
    .object({
      signatureLabels: z.array(z.string().min(1).max(100)).max(4),
    })
    .optional(),
});

export type TenantProfileUpdate = z.infer<typeof tenantProfileUpdateSchema>;

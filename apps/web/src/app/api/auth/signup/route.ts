import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/** Allow more time for cold start + DB; Hobby default is 10s without this, max 60s when configured. */
export const maxDuration = 60;
export const runtime = 'nodejs';

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const signupSchema = z.object({
  schoolName: z.string().min(1).max(200),
  slug: z.string().min(2).max(50).toLowerCase().regex(slugRegex),
  adminName: z.string().min(1).max(200),
  adminEmail: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const existingSlug = await tx.tenant.findUnique({ where: { slug: data.slug } });
      if (existingSlug) {
        throw new Error('School code is already taken. Choose another.');
      }
      const existingEmail = await tx.user.findUnique({ where: { email: data.adminEmail } });
      if (existingEmail) {
        throw new Error('This email is already registered.');
      }

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const tenant = await tx.tenant.create({
        data: {
          name: data.schoolName,
          slug: data.slug,
          city: data.city ?? '',
          state: data.state ?? '',
          country: data.country ?? undefined,
        },
      });
      await tx.tenantSettings.create({ data: { tenantId: tenant.id, sportsLimitTrial: 2 } });
      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'TRIAL',
          status: 'TRIALING',
          trialEndsAt,
        },
      });
      await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail,
          passwordHash,
          role: 'SCHOOL_ADMIN',
          tenantId: tenant.id,
        },
      });
      return tenant.id;
    });

    return NextResponse.json({ ok: true, tenantId: result, message: 'Account created. You can sign in now.' }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    if (message.includes('already')) {
      return NextResponse.json({ error: message, code: 'CONFLICT' }, { status: 409 });
    }
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}


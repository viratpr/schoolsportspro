import type { FastifyInstance } from 'fastify';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { signupSchema } from '../schemas/tenant.js';
import { conflict } from '../lib/errors.js';
import { Role } from '@prisma/client';

const require = createRequire(import.meta.url);
const { compare: bcryptCompare, hash: bcryptHash } = require('bcryptjs');

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
});

const supabaseBridgeSchema = z.object({
  accessToken: z.string().min(1, 'accessToken required'),
});

function supabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return url?.trim() && anonKey?.trim() ? { url: url.trim(), anonKey: anonKey.trim() } : null;
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const RESET_TOKEN_EXPIRY_HOURS = 1;

export default async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email?: string; password?: string } }>('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid email or password', code: 'VALIDATION_ERROR' });
    }
    const user = await prisma.user.findUnique({
      where: { email: body.data.email },
    });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password', code: 'USER_NOT_FOUND' });
    }
    if (user.passwordHash == null) {
      return reply.status(401).send({
        error:
          'This account has no app password—use Supabase email sign-in for this email, or ask an admin to set a password.',
        code: 'NO_APP_PASSWORD',
      });
    }
    const passwordOk = await bcryptCompare(body.data.password, user.passwordHash);
    if (!passwordOk) {
      return reply.status(401).send({ error: 'Invalid email or password', code: 'INVALID_PASSWORD' });
    }
    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId ?? null,
      },
      { expiresIn: '7d' }
    );
    return reply.send({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });
  });

  app.post<{
    Body: {
      schoolName?: string;
      slug?: string;
      adminName?: string;
      adminEmail?: string;
      password?: string;
      country?: string;
      state?: string;
      city?: string;
    };
  }>('/auth/signup', async (request, reply) => {
    const body = signupSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      });
    }
    const data = body.data;
    const existingSlug = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existingSlug) throw conflict('School code is already taken. Choose another.');
    const existingEmail = await prisma.user.findUnique({ where: { email: data.adminEmail } });
    if (existingEmail) throw conflict('This email is already registered.');

    const passwordHash = await bcryptHash(data.password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const tenant = await prisma.tenant.create({
      data: {
        name: data.schoolName,
        slug: data.slug,
        city: data.city ?? '',
        state: data.state ?? '',
        country: data.country ?? undefined,
      },
    });
    await prisma.tenantSettings.create({
      data: { tenantId: tenant.id, sportsLimitTrial: 2 },
    });
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'TRIAL',
        status: 'TRIALING',
        trialEndsAt,
      },
    });
    await prisma.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        passwordHash,
        role: Role.SCHOOL_ADMIN,
        tenantId: tenant.id,
      },
    });
    return reply.status(201).send({ ok: true, tenantId: tenant.id, message: 'Account created. You can sign in now.' });
  });

  /**
   * After Supabase Auth validates the user, mint the same Fastify JWT as /auth/login
   * if a matching Prisma User exists (role/tenant come from the app DB, not Supabase).
   */
  app.post<{ Body: { accessToken?: string } }>('/auth/supabase-bridge', async (request, reply) => {
    const body = supabaseBridgeSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'accessToken required',
        code: 'VALIDATION_ERROR',
      });
    }
    const env = supabaseEnv();
    if (!env) {
      return reply.status(503).send({
        error: 'Supabase is not configured on the API.',
        code: 'SUPABASE_DISABLED',
      });
    }
    const supabase = createClient(env.url, env.anonKey);
    const { data: authData, error } = await supabase.auth.getUser(body.data.accessToken);
    if (error || !authData.user?.email) {
      return reply.status(401).send({
        error: 'Invalid or expired Supabase session',
        code: 'UNAUTHORIZED',
      });
    }
    const email = authData.user.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(403).send({
        error:
          'No application profile for this account. Use an email your school admin added in the app, or sign up to create a school.',
        code: 'NOT_PROVISIONED',
      });
    }
    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId ?? null,
      },
      { expiresIn: '7d' }
    );
    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  });

  app.post<{ Body: { email?: string } }>('/auth/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid email required', code: 'VALIDATION_ERROR' });
    }
    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      return reply.send({ ok: true, message: 'If an account exists for this email, you will receive a reset link.' });
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[forgot-password] Reset link for', user.email, ':', resetLink);
    }
    return reply.send({
      ok: true,
      message: 'If an account exists for this email, you will receive a reset link.',
      ...(process.env.NODE_ENV !== 'production' && { resetLink }),
    });
  });

  app.post<{ Body: { token?: string; newPassword?: string } }>('/auth/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: body.error.errors[0]?.message ?? 'Validation failed',
        code: 'VALIDATION_ERROR',
      });
    }
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: body.data.token },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired reset link. Please request a new one.', code: 'INVALID_TOKEN' });
    }
    const passwordHash = await bcryptHash(body.data.newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);
    return reply.send({ ok: true, message: 'Password reset. You can sign in with your new password.' });
  });
}

import type { FastifyInstance, FastifyRequest } from 'fastify';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Role, SubscriptionPlan } from '@bharatathlete/db';
import { prisma } from '../lib/prisma.js';
import { requireRole, verifyJWT } from '../middleware/auth.js';
import {
  PLAN_DETAILS,
  inclusivePaiseForPlan,
  type BillingPlanKey,
} from '../lib/billing-pricing.js';
import { razorpayEnvPresence, razorpayKeyId, razorpayKeySecret } from '../lib/razorpay-env.js';

type AuthedUser = { userId: string; tenantId: string | null; role: Role; email: string };

const createOrderBody = z.object({
  plan: z.string().min(1),
});

const verifyBody = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  plan: z.string().min(1),
});

function getUser(request: FastifyRequest): AuthedUser {
  return (request as FastifyRequest & { user: AuthedUser }).user;
}

function verifyPaymentSignature(keySecret: string, orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + '|' + paymentId;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}

export default async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.post('/billing/razorpay/create-order', async (request, reply) => {
    const user = getUser(request);
    if (!user.tenantId) {
      return reply.status(400).send({ error: 'No tenant', code: 'NO_TENANT' });
    }
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

    const parsed = createOrderBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const plan = parsed.data.plan as BillingPlanKey;
    if (!(plan in PLAN_DETAILS)) {
      return reply.status(400).send({ error: 'Invalid plan', code: 'INVALID_PLAN' });
    }

    const keyId = razorpayKeyId();
    const keySecret = razorpayKeySecret();
    if (!keyId || !keySecret) {
      const hint = keyId && !keySecret
        ? 'Key ID is set on the API, but RAZORPAY_KEY_SECRET (or RAZORPAY_SECRET) is missing. Set it on the API process and redeploy.'
        : !keyId && keySecret
          ? 'Key secret is set but no key ID. Set RAZORPAY_KEY_ID (or NEXT_PUBLIC_RAZORPAY_KEY_ID) on the API process.'
          : 'Set RAZORPAY_KEY_SECRET (or RAZORPAY_SECRET) and RAZORPAY_KEY_ID on the API process.';
      return reply.status(500).send({
        error: 'Razorpay not configured',
        code: 'RAZORPAY_NOT_CONFIGURED',
        details: {
          missing: { keySecret: !keySecret, keyId: !keyId },
          razorpayEnvPresent: razorpayEnvPresence(),
          hint,
        },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found', code: 'NOT_FOUND' });
    }

    const amountPaise = inclusivePaiseForPlan(plan);
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${user.tenantId.slice(0, 8)}_${plan}_${Date.now()}`.slice(0, 40),
        notes: { tenantId: user.tenantId, plan },
      });
      return reply.send({
        orderId: order.id,
        amount: amountPaise,
        currency: 'INR',
        keyId,
        plan,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to create order', code: 'RAZORPAY_ORDER_FAILED' });
    }
  });

  app.post('/billing/razorpay/verify', async (request, reply) => {
    const user = getUser(request);
    if (!user.tenantId) {
      return reply.status(400).send({ error: 'No tenant', code: 'NO_TENANT' });
    }
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

    const keySecret = razorpayKeySecret();
    if (!keySecret) {
      return reply.status(500).send({
        error: 'Razorpay not configured',
        code: 'RAZORPAY_NOT_CONFIGURED',
        details: {
          missing: { keySecret: true },
          razorpayEnvPresent: razorpayEnvPresence(),
          hint: 'Set RAZORPAY_KEY_SECRET or RAZORPAY_SECRET on the API process and redeploy.',
        },
      });
    }

    const parsed = verifyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = parsed.data;
    if (!(plan in PLAN_DETAILS)) {
      return reply.status(400).send({ error: 'Invalid plan', code: 'INVALID_PLAN' });
    }

    if (!verifyPaymentSignature(keySecret, razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return reply.status(400).send({ error: 'Payment verification failed', code: 'VERIFY_FAILED' });
    }

    const subPlan = plan as SubscriptionPlan;
    const { months } = PLAN_DETAILS[plan as BillingPlanKey];
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + months);

    await prisma.tenantSubscription.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        plan: subPlan,
        status: 'ACTIVE',
        currentPeriodEnd,
      },
      update: {
        plan: subPlan,
        status: 'ACTIVE',
        currentPeriodEnd,
      },
    });

    return reply.send({ success: true });
  });
}

import type { FastifyInstance, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRole, verifyJWT } from '../middleware/auth.js';
import { PLAN_DETAILS, type BillingPlanKey } from '../lib/billing-pricing.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';

type AuthedUser = { userId: string; tenantId: string | null; role: Role; email: string };

const checkoutBody = z.object({
  plan: z.enum(['TOURNAMENT_PASS', 'ANNUAL_PRO']),
});

function getUser(request: FastifyRequest): AuthedUser {
  return (request as FastifyRequest & { user: AuthedUser }).user;
}

function getAppUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new AppError(500, 'Stripe is not configured', 'STRIPE_NOT_CONFIGURED');
  }
  return new Stripe(key);
}

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new AppError(500, 'Stripe webhook secret is not configured', 'STRIPE_NOT_CONFIGURED');
  }
  return secret;
}

function getPriceIdForPlan(plan: BillingPlanKey): string {
  const map: Record<BillingPlanKey, string | undefined> = {
    TOURNAMENT_PASS: process.env.STRIPE_PRICE_ID_TOURNAMENT_PASS?.trim(),
    ANNUAL_PRO: process.env.STRIPE_PRICE_ID_ANNUAL_PRO?.trim(),
  };
  const priceId = map[plan];
  if (!priceId) {
    throw new AppError(500, `Missing Stripe price ID for ${plan}`, 'STRIPE_PRICE_MISSING');
  }
  return priceId;
}

function mapPriceIdToPlan(priceId: string | null | undefined): BillingPlanKey | null {
  if (!priceId) return null;
  const tournamentPassId = process.env.STRIPE_PRICE_ID_TOURNAMENT_PASS?.trim();
  const annualProId = process.env.STRIPE_PRICE_ID_ANNUAL_PRO?.trim();
  if (priceId === tournamentPassId) return 'TOURNAMENT_PASS';
  if (priceId === annualProId) return 'ANNUAL_PRO';
  return null;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
      return 'PAST_DUE';
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'INCOMPLETE';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}

function toDate(unixTs: number | null | undefined): Date | null {
  return unixTs ? new Date(unixTs * 1000) : null;
}

async function resolveTenantId(metadataTenantId: string | null, stripeCustomerId: string | null): Promise<string | null> {
  if (metadataTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: metadataTenantId }, select: { id: true } });
    if (tenant) return tenant.id;
  }
  if (!stripeCustomerId) return null;
  const sub = await prisma.tenantSubscription.findFirst({
    where: { stripeCustomerId },
    select: { tenantId: true },
  });
  return sub?.tenantId ?? null;
}

export default async function billingRoutes(app: FastifyInstance) {
  app.post('/billing/stripe/webhook', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      throw badRequest('Missing stripe-signature header', 'STRIPE_SIGNATURE_MISSING');
    }

    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody;
    if (!rawBody) {
      throw new AppError(400, 'Missing raw webhook payload', 'STRIPE_PAYLOAD_MISSING');
    }

    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw badRequest('Stripe webhook signature verification failed', 'STRIPE_SIGNATURE_INVALID');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId ?? null;
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null;

      if (tenantId && customerId) {
        await prisma.tenantSubscription.upsert({
          where: { tenantId },
          create: {
            tenantId,
            plan: 'TRIAL',
            status: 'TRIALING',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
          },
        });
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionAny = subscription as Stripe.Subscription & {
        current_period_end?: number;
        trial_end?: number;
      };
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null;

      const tenantId = await resolveTenantId(subscription.metadata?.tenantId ?? null, customerId);
      if (!tenantId) {
        request.log.warn({ eventType: event.type, customerId }, 'Stripe webhook ignored: tenant not resolved');
        return reply.send({ received: true });
      }

      const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
      const lineItemPrice = subscription.items.data[0]?.price?.id ?? null;
      const planFromPrice = mapPriceIdToPlan(lineItemPrice);
      const metadataPlan = subscription.metadata?.plan;
      const planFromMetadata =
        metadataPlan && metadataPlan in PLAN_DETAILS
          ? (metadataPlan as BillingPlanKey)
          : null;

      const resolvedPlan: SubscriptionPlan =
        (planFromMetadata ?? planFromPrice ?? (existing?.plan as BillingPlanKey | undefined) ?? 'TOURNAMENT_PASS') as SubscriptionPlan;

      await prisma.tenantSubscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan: resolvedPlan,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: toDate(subscriptionAny.current_period_end) ?? undefined,
          trialEndsAt: toDate(subscriptionAny.trial_end) ?? undefined,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscription.id,
        },
        update: {
          plan: resolvedPlan,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: toDate(subscriptionAny.current_period_end) ?? null,
          trialEndsAt: toDate(subscriptionAny.trial_end) ?? null,
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscription.id,
        },
      });
    }

    return reply.send({ received: true });
  });

  app.addHook('preHandler', verifyJWT);

  app.post('/billing/stripe/checkout-session', async (request, reply) => {
    const user = getUser(request);
    if (!user.tenantId) throw badRequest('No tenant', 'NO_TENANT');
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

    const { plan } = checkoutBody.parse(request.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) throw notFound('Tenant not found');

    const stripe = getStripeClient();
    const priceId = getPriceIdForPlan(plan);
    const appUrl = getAppUrl();
    const existingSub = await prisma.tenantSubscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { stripeCustomerId: true },
    });

    let customerId = existingSub?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenantSubscription.upsert({
        where: { tenantId: user.tenantId },
        create: {
          tenantId: user.tenantId,
          plan: 'TRIAL',
          status: 'TRIALING',
          stripeCustomerId: customerId,
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/billing?success=1`,
      cancel_url: `${appUrl}/app/billing?canceled=1`,
      metadata: {
        tenantId: user.tenantId,
        plan,
      },
      subscription_data: {
        metadata: {
          tenantId: user.tenantId,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return reply.send({ url: session.url, sessionId: session.id, plan });
  });

  app.post('/billing/stripe/portal-session', async (request, reply) => {
    const user = getUser(request);
    if (!user.tenantId) throw badRequest('No tenant', 'NO_TENANT');
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);

    const sub = await prisma.tenantSubscription.findUnique({
      where: { tenantId: user.tenantId },
      select: { stripeCustomerId: true },
    });
    if (!sub?.stripeCustomerId) {
      throw badRequest('No Stripe customer found for this tenant', 'STRIPE_CUSTOMER_MISSING');
    }

    const stripe = getStripeClient();
    const appUrl = getAppUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/app/billing`,
    });
    return reply.send({ url: session.url });
  });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Razorpay from 'razorpay';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inclusivePaiseForPlan, type BillingPlanKey, PLAN_DETAILS } from '@/lib/billing-pricing';

type CreateOrderPlan = BillingPlanKey;

function razorpayKeys() {
  // Read at request time — top-level `process.env` in Route Handlers can be baked in as empty during bundling.
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const { keyId, keySecret } = razorpayKeys();

  if (!keySecret || !keyId) {
    return NextResponse.json(
      {
        error: 'Razorpay not configured',
        missing: {
          RAZORPAY_KEY_SECRET: !keySecret,
          keyId: !keyId,
        },
        hint:
          'Set RAZORPAY_KEY_SECRET and RAZORPAY_KEY_ID (or NEXT_PUBLIC_RAZORPAY_KEY_ID for the key only) in the repo root .env or apps/web/.env.local, then restart the Next.js dev server.',
      },
      { status: 500 }
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const plan = body.plan as CreateOrderPlan | undefined;
  if (!plan || !(plan in PLAN_DETAILS)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { subscription: true } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const amountPaise = inclusivePaiseForPlan(plan);
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${tenantId.slice(0, 8)}_${plan}_${Date.now()}`.slice(0, 40),
      notes: { tenantId, plan },
    });
    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId,
      plan,
    });
  } catch (err) {
    console.error('Razorpay order create error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

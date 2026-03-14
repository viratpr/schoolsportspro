import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'node:crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const keySecret = process.env.RAZORPAY_KEY_SECRET;

const PLANS = {
  TOURNAMENT_PASS: { months: 3 },
  ANNUAL_PRO: { months: 12 },
} as const;

export type VerifyPlan = keyof typeof PLANS;

function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!keySecret) return false;
  const body = orderId + '|' + paymentId;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  if (!keySecret) return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });

  let body: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string; plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }
  if (!PLANS[plan as VerifyPlan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  const { months } = PLANS[plan as VerifyPlan];
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + months);

  await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan: plan as VerifyPlan,
      status: 'ACTIVE',
      currentPeriodEnd,
    },
    update: {
      plan: plan as VerifyPlan,
      status: 'ACTIVE',
      currentPeriodEnd,
    },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';

/** Stripe webhook disabled. Payments are handled via Razorpay and verified in /api/billing/verify. */
export async function POST() {
  return NextResponse.json({ received: true });
}

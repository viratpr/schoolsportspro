import { NextResponse } from 'next/server';

/** Stripe webhook disabled. Payments are handled via Razorpay and verified on the Fastify API (`POST /billing/razorpay/verify`). */
export async function POST() {
  return NextResponse.json({ received: true });
}

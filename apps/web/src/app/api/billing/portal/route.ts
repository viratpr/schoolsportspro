import { NextResponse } from 'next/server';

/** Stripe portal is not used. Razorpay does not provide a hosted portal; contact support for billing changes. */
export async function POST() {
  return NextResponse.json(
    { error: 'For billing help or to change plan, please contact support.' },
    { status: 410 }
  );
}

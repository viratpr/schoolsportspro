import { NextResponse } from 'next/server';

/** Stripe checkout is replaced by Razorpay. Use create-order + Razorpay Checkout on the billing page. */
export async function POST() {
  return NextResponse.json(
    { error: 'Use Razorpay: go to Billing and choose Tournament Pass or Annual Pro.' },
    { status: 410 }
  );
}

import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature') ?? '';
  const body = await request.text();
  const response = await fetch(`${API_URL}/billing/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
    body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ received: false }));
  return NextResponse.json(payload, { status: response.status });
}

import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-base';

export async function POST(request: Request) {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return NextResponse.json({ error: 'API base URL is not configured' }, { status: 500 });
  }
  const signature = request.headers.get('stripe-signature') ?? '';
  const body = await request.text();
  const response = await fetch(`${apiBase}/billing/stripe/webhook`, {
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

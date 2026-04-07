import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const apiToken = (session as { apiToken?: string } | null)?.apiToken;
  if (!apiToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_URL}/billing/stripe/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

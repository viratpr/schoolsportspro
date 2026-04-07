import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export async function POST() {
  const session = await getServerSession(authOptions);
  const apiToken = (session as { apiToken?: string } | null)?.apiToken;
  if (!apiToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${API_URL}/billing/stripe/portal-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

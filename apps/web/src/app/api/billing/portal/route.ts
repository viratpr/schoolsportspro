import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-base';

export async function POST() {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return NextResponse.json({ error: 'API base URL is not configured' }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  const apiToken = (session as { apiToken?: string } | null)?.apiToken;
  if (!apiToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${apiBase}/billing/stripe/portal-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-base';

export async function POST(request: Request) {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return NextResponse.json({ error: 'API base URL is not configured' }, { status: 500 });
  }
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const res = await fetch(`${apiBase}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Request failed' }, { status: res.status });
  }
  return NextResponse.json(data);
}

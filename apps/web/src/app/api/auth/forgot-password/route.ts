import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3001' : 'http://localhost:3001');

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const res = await fetch(`${API_URL}/auth/forgot-password`, {
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

import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  return createClient(request);
}

export const config = {
  // Skip /api/* so /api/rest (Fastify) and /api/auth are not blocked by Supabase getUser().
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

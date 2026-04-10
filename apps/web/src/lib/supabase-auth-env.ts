import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser + server. Prefer the anon JWT (eyJ…) from Settings → API — some sb_publishable_…
 * keys do not work reliably with signInWithPassword; fall back to publishable if anon unset.
 */
export function getSupabaseAuthClient(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  )?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

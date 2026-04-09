import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Browser + server: anon/publishable key is enough for signInWithPassword and getUser(accessToken). */
export function getSupabaseAuthClient(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

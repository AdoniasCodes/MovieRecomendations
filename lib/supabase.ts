// Gated Supabase client (Phase 3). Returns null until env is set, so the app
// keeps running entirely on the mock store. When you add the env vars and flip
// the store over to this layer, screens don't change (same action seam).
//
// Env (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null | undefined;

/** true once both public Supabase env vars are present */
export function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** the browser client, or null when Supabase isn't configured yet */
export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  if (!supabaseConfigured()) {
    _client = null;
    return null;
  }
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
  return _client;
}

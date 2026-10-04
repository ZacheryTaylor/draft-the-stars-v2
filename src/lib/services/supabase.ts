import { env } from "./env";

/**
 * Supabase placeholder. TODO(supabase): npm i @supabase/supabase-js @supabase/ssr and return
 * createServerClient(env.supabase.url, env.supabase.anonKey, { cookies }) here; implement
 * SupabaseAdapter (src/lib/data/adapter.ts) against the tables in supabase/migrations.
 */
export function supabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey);
}

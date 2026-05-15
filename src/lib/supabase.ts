import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Client-side Supabase client (browser).
 * Uses the anon key — Row Level Security applies.
 * Gracefully handles missing env vars during build.
 */
export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({} as SupabaseClient, {
      get: () => {
        throw new Error(
          "Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
      },
    }) as SupabaseClient);

/**
 * Server-side Supabase client (API routes).
 * Uses the service role key to bypass RLS for writes.
 */
export function createServerClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl) {
    throw new Error("Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

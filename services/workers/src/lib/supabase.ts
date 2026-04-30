import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service-role key.
 * NEVER expose this client or its key to the browser/frontend.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return supabaseInstance;
}

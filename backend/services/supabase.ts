import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createSupabaseClient(env: SupabaseEnv, accessToken?: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  });
}


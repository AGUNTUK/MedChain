import { createClient } from "@supabase/supabase-js";

/**
 * Lazy-initialized Supabase Client for MediChain
 * 
 * Safely accesses client-side public environment variables (VITE_SUPABASE_URL 
 * and VITE_SUPABASE_ANON_KEY) and implements graceful fallback logic 
 * to prevent startup crashes when keys are not yet configured.
 */

const getEnvVar = (key: string): string | undefined => {
  if (typeof window !== "undefined") {
    return (import.meta as any).env?.[key];
  }
  return (import.meta as any).env?.[key] || (typeof process !== "undefined" ? process.env?.[key] : undefined);
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseClientInstance: any = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    // Return a dummy client proxy with warnings for graceful development fallback
    console.warn(
      "Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured. " +
      "MediChain is currently running in local offline demo mode using the server-side JSON store."
    );
    
    return new Proxy({}, {
      get: () => {
        return () => {
          throw new Error(
            "Supabase is not configured yet. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
          );
        };
      }
    }) as any;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClientInstance;
}

export const supabase = getSupabaseClient();

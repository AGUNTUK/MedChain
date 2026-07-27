import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClientInstance) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn(
        "Supabase Admin credentials missing: VITE_SUPABASE_URL / SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured. Using dummy fallback client."
      );
      // Dummy chainable fallback client proxy that safely returns empty results
      const mockQueryBuilder: any = new Proxy({}, {
        get(_t, method) {
          if (method === "then") {
            return (resolve: any) => resolve({ data: [], error: null, count: 0 });
          }
          return () => mockQueryBuilder;
        }
      });

      return new Proxy({} as SupabaseClient, {
        get(_t, prop) {
          if (prop === "from") return () => mockQueryBuilder;
          if (prop === "auth") return { admin: mockQueryBuilder };
          if (prop === "rpc") return () => Promise.resolve({ data: null, error: null });
          if (prop === "storage") return { from: () => mockQueryBuilder };
          return () => mockQueryBuilder;
        }
      });
    }

    adminClientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClientInstance;
}

// Proxy wrapper for `supabaseAdmin` export so existing imports (`import { supabaseAdmin } from ...`)
// continue to work seamlessly, lazily initializing upon property access / API call execution.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

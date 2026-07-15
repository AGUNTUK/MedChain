import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("WARNING: Backend is running without complete Supabase Service Role credentials.");
}

export const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceRoleKey || ""
);

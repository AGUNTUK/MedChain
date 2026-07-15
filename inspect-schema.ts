import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function inspect() {
  const tables = [
    "users", "pharmacies", "categories", "products", "inventory", 
    "credit_accounts", "orders", "order_items", "payments", 
    "invoices", "notifications", "prescriptions", "returns", "favourites",
    "audit_logs", "notification_preferences", "import_history", 
    "export_history", "price_history", "alert_logs", "system_settings"
  ];

  for (const table of tables) {
    try {
      // We can query information_schema via postgres RPC or just select 1 row and print keys,
      // or do a simple select limit 1.
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .limit(1);

      if (error) {
        console.log(`Table ${table}: ERROR ${error.message}`);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        if (columns.length > 0) {
          console.log(`Table ${table}: ${columns.join(", ")}`);
        } else {
          // If table is empty, we can try to find columns by inserting/selecting or just querying information_schema
          // But since RPC information_schema is restricted sometimes, let's run a query to get columns
          console.log(`Table ${table}: EXISTS (empty)`);
        }
      }
    } catch (err: any) {
      console.log(`Table ${table}: EXCEPTION ${err.message}`);
    }
  }
}

inspect();

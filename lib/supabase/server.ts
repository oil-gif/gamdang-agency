import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
}

/**
 * The only Supabase client in this app. Full access (bypasses RLS) — only
 * ever import this from server-side code (Server Actions, Route Handlers,
 * Server Components). The `server-only` import above makes the build fail
 * if a Client Component ever tries to import this file.
 */
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false },
});

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Public client — safe to use in client components. Respects RLS. */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

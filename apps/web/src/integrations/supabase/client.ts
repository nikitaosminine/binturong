import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Publishable key is safe to embed — it is protected by RLS, not secrecy.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://sfqowvpuzsqgmwlecgdx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_xcYBQwzQm7_Cv8eoqAI8rw_eFVLZiGp";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

// Singleton for client components (matches previous usage pattern)
export const supabase = createClient();

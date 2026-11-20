import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for trusted server code (webhooks). Bypasses RLS.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hasAdminKey = () => !!process.env.SUPABASE_SECRET_KEY;

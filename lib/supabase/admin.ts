import { createClient } from "@supabase/supabase-js"

// Server-side only: uses service_role key to bypass RLS
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

// lib/supabase/service-role.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. USE ONLY IN SERVER ACTIONS THAT NEED IT.
 *
 * Currently the only legitimate consumer is media-request-upload.ts, which
 * needs to create a signed upload URL for a private bucket where only
 * service_role has INSERT permission (M1 policy).
 *
 * DO NOT use for reads or general RPC calls — those go through the
 * per-request `createClient()` helper so they're bound to the user's JWT.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
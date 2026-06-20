"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-side TOTP MFA helpers (Application Structure §4). Administrators are
 * required to enrol; used by the (auth)/mfa and account screens in a later phase.
 *
 * NOTE: assumes lib/supabase/client.ts exports a browser `createClient()`.
 */
export async function listFactors() {
  const supabase = createClient();
  return supabase.auth.mfa.listFactors();
}

export async function enrollTotp() {
  const supabase = createClient();
  return supabase.auth.mfa.enroll({ factorType: "totp" });
}

export async function verifyTotp(factorId: string, code: string) {
  const supabase = createClient();
  const { data: challenge, error } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (error) throw error;
  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
}

export async function getAssuranceLevel() {
  const supabase = createClient();
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel();
}

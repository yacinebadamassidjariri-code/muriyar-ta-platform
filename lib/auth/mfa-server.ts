import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffMfaStatus = {
  enrolled: boolean;
  verifiedForSession: boolean;
};

export function isAdminMfaEnforcementEnabled(): boolean {
  return process.env.ADMIN_MFA_ENFORCEMENT === "true";
}

export const getStaffMfaStatus = cache(async (): Promise<StaffMfaStatus> => {
  const supabase = await createClient();
  const [factorsResult, claimsResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.getClaims(),
  ]);

  const factors = factorsResult.data?.all ?? [];
  return {
    enrolled: factors.some((factor) => factor.status === "verified"),
    verifiedForSession: claimsResult.data?.claims.aal === "aal2",
  };
});

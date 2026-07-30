import "server-only";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser, type Profile } from "@/lib/auth/session";
import type { Permission } from "@/lib/constants/permissions";

export type AdminActionErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "conflict"
  | "service_unavailable"
  | "request_failed";

export type AdminActionContext = {
  locale: string;
  profile: Profile;
  requestId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export type AdminActionAuthorization =
  | { ok: true; value: AdminActionContext }
  | {
      ok: false;
      error: AdminActionErrorCode;
      requestId: string;
      locale: string;
    };

/**
 * Shared first step for every administrative mutation. UI visibility is not an
 * authorization boundary; actions authenticate and authorize again here, while
 * their RPCs/RLS policies perform the final database-side check.
 */
export async function authorizeAdminAction(
  permission: Permission,
): Promise<AdminActionAuthorization> {
  const requestId = crypto.randomUUID();
  const [user, profile, locale] = await Promise.all([
    getUser(),
    getProfile(),
    getLocale(),
  ]);

  if (!user) {
    return { ok: false, error: "unauthenticated", requestId, locale };
  }
  if (
    !profile?.is_active ||
    !profile.permissions.includes("admin.access") ||
    !profile.permissions.includes(permission)
  ) {
    return { ok: false, error: "forbidden", requestId, locale };
  }

  return {
    ok: true,
    value: {
      locale,
      profile,
      requestId,
      supabase: await createClient(),
    },
  };
}

const SAFE_DATABASE_CODES = new Set<AdminActionErrorCode>([
  "forbidden",
  "not_found",
  "conflict",
  "invalid_input",
  "service_unavailable",
]);

export function safeDatabaseError(
  message: string | undefined,
): AdminActionErrorCode {
  if (!message) return "request_failed";
  return SAFE_DATABASE_CODES.has(message as AdminActionErrorCode)
    ? (message as AdminActionErrorCode)
    : "request_failed";
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function cleanText(
  value: unknown,
  maxLength: number,
  required = false,
): string | null {
  if (typeof value !== "string") return required ? null : "";
  const cleaned = value.trim();
  if ((required && cleaned.length === 0) || cleaned.length > maxLength) {
    return null;
  }
  return cleaned;
}

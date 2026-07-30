import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants/roles";
import type { Permission } from "@/lib/constants/permissions";

/**
 * Reads the authenticated user and their profile/role. `cache()` dedupes these
 * within a single server render so guards and layouts don't re-query.
 *
 * NOTE: assumes lib/supabase/server.ts exports an async `createClient()`
 * (the @supabase/ssr Next.js server helper). Adjust the import if yours differs.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type Profile = {
  user_id: string;
  display_name: string | null;
  is_active: boolean;
  preferred_language: string | null;
  roles: AppRole[];
  permissions: Permission[];
};

type AdminContextRow = {
  user_id?: unknown;
  display_name?: unknown;
  is_active?: unknown;
  preferred_language?: unknown;
  roles?: unknown;
  permissions?: unknown;
};

function stringArray<T extends string>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => typeof item === "string")
    : [];
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_admin_context");
  if (error || !data || typeof data !== "object") return null;

  const row = data as AdminContextRow;
  if (typeof row.user_id !== "string") return null;

  return {
    user_id: row.user_id,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    is_active: row.is_active === true,
    preferred_language:
      typeof row.preferred_language === "string"
        ? row.preferred_language
        : null,
    roles: stringArray<AppRole>(row.roles),
    permissions: stringArray<Permission>(row.permissions),
  };
});

export const getRoles = cache(async (): Promise<AppRole[]> => {
  return (await getProfile())?.roles ?? [];
});

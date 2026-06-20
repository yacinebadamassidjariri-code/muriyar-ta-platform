import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants/roles";

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
  role: AppRole;
};

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: u } = await supabase
    .from("users")
    .select("user_id, display_name, is_active, preferred_language, role_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!u) return null;

  const { data: r } = await supabase
    .from("roles")
    .select("name")
    .eq("role_id", (u as { role_id: number }).role_id)
    .maybeSingle();

  const role = ((r as { name: string } | null)?.name ??
    "registered_reader") as AppRole;

  return {
    user_id: user.id,
    display_name: (u as { display_name: string | null }).display_name ?? null,
    is_active: (u as { is_active: boolean }).is_active ?? true,
    preferred_language:
      (u as { preferred_language: string | null }).preferred_language ?? null,
    role,
  };
});

export const getRole = cache(async (): Promise<AppRole | null> => {
  return (await getProfile())?.role ?? null;
});

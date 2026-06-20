import "server-only";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile, type Profile } from "./session";
import { STAFF_ROLES, type AppRole } from "@/lib/constants/roles";
import type { Permission } from "@/lib/constants/permissions";

async function loginRedirect(): Promise<never> {
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}

/** Require any authenticated user; otherwise redirect to localized /login. */
export async function requireUser() {
  const user = await getUser();
  if (!user) await loginRedirect();
  return user!;
}

/** Require an active profile (redirect to login if absent; 404 if deactivated). */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) await loginRedirect();
  if (!profile!.is_active) notFound();
  return profile!;
}

/** Require a staff role (moderator/editor/administrator). */
export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (!STAFF_ROLES.includes(profile.role)) notFound();
  return profile;
}

/** Require one of the given roles. */
export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) notFound();
  return profile;
}

/** Require a specific permission, resolved via the has_permission() RPC. */
export async function requirePermission(code: Permission): Promise<Profile> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", { p: code });
  if (error || data !== true) notFound();
  return profile;
}

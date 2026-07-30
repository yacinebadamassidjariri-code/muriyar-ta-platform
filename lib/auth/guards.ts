import "server-only";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getUser, getProfile, type Profile } from "./session";
import type { AppRole } from "@/lib/constants/roles";
import type { Permission } from "@/lib/constants/permissions";

async function loginRedirect(): Promise<never> {
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}

export async function requireUser() {
  const user = await getUser();
  if (!user) await loginRedirect();
  return user!;
}

export async function requireProfile(): Promise<Profile> {
  const user = await getUser();
  if (!user) return await loginRedirect();

  const profile = await getProfile();

  if (!profile) {
    return await permissionDeniedRedirect();
  }

  if (!profile.is_active) await permissionDeniedRedirect();

  return profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.permissions.includes("admin.access")) {
    await permissionDeniedRedirect();
  }
  return profile;
}

export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.roles.some((role) => roles.includes(role))) {
    await permissionDeniedRedirect();
  }
  return profile;
}

/** Require a specific permission, resolved via the has_permission() RPC. */
export async function requirePermission(
  code: Permission,
): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.permissions.includes(code)) await permissionDeniedRedirect();

  return profile;
}

async function permissionDeniedRedirect(): Promise<never> {
  const locale = await getLocale();
  redirect(`/${locale}/admin/denied`);
}

export async function hasPermission(code: Permission): Promise<boolean> {
  const profile = await getProfile();
  return !!profile?.is_active && profile.permissions.includes(code);
}

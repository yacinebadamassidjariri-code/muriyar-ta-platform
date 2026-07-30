import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPermissionDenied } from "@/components/admin/admin-states";
import { getAdminCopy } from "@/components/admin/content";
import { getProfile, getUser } from "@/lib/auth/session";
import {
  getStaffMfaStatus,
  isAdminMfaEnforcementEnabled,
} from "@/lib/auth/mfa-server";
import { adminNav } from "@/lib/constants/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getAdminCopy(locale);
  return {
    title: { default: copy.product, template: `%s · ${copy.product}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getAdminCopy(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/login?next=admin`);

  const profile = await getProfile();
  if (!profile?.is_active || !profile.permissions.includes("admin.access")) {
    return <AdminPermissionDenied copy={copy} inactive={profile?.is_active === false} />;
  }

  const mfa = await getStaffMfaStatus();
  if (isAdminMfaEnforcementEnabled() && !mfa.verifiedForSession) {
    redirect(`/${locale}/mfa`);
  }

  const items = adminNav
    .filter((item) => profile.permissions.includes(item.permission))
    .map((item) => ({ href: item.href, label: copy.nav[item.key] }));

  return (
    <AdminShell
      locale={locale}
      copy={copy}
      displayName={profile.display_name || copy.staffMember}
      roles={profile.roles}
      items={items}
    >
      {children}
    </AdminShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAdminCopy } from "@/components/admin/content";
import { getProfile, getUser } from "@/lib/auth/session";
import { getStaffMfaStatus } from "@/lib/auth/mfa-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: getAdminCopy(locale).mfaRequiredTitle,
    robots: { index: false, follow: false },
  };
}

export default async function MfaRequiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const [profile, status] = await Promise.all([getProfile(), getStaffMfaStatus()]);
  if (!profile?.is_active || !profile.permissions.includes("admin.access")) {
    redirect(`/${locale}/`);
  }
  if (status.verifiedForSession) redirect(`/${locale}/admin`);

  const copy = getAdminCopy(locale);
  return (
    <section className="rounded-xl border border-warning-500/30 bg-warning-50 p-6 sm:p-8">
      <h1 className="font-display text-4xl font-semibold text-plum-900">
        {copy.mfaRequiredTitle}
      </h1>
      <p className="mt-4 leading-7 text-stone-700">{copy.mfaRequiredBody}</p>
    </section>
  );
}

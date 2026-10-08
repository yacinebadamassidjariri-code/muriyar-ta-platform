import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthCopy } from "@/components/auth/content";
import { TotpEnrollForm } from "@/components/auth/totp-enroll-form";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { getProfile, getUser } from "@/lib/auth/session";
import { getStaffMfaStatus } from "@/lib/auth/mfa-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getAuthCopy(locale);
  return {
    title: copy.mfaEnrollTitle,
    robots: { index: false, follow: false },
  };
}

/**
 * MFA page — serves two distinct flows depending on the administrator's
 * factor state:
 *
 *   • Not enrolled  → TotpEnrollForm: QR code + secret + 6-digit confirm.
 *   • Enrolled, unverified → TotpVerifyForm: 6-digit TOTP challenge.
 *
 * Guards:
 *   - Unauthenticated → /login
 *   - Not an active admin → /
 *   - Already AAL2 → /admin (enforcement gate redirected here unnecessarily)
 *
 * Enforcement remains OFF (ADMIN_MFA_ENFORCEMENT env var) until the
 * founder has completed enrollment and confirmed sign-in + verification
 * works end-to-end.
 */
export default async function MfaPage({
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

  const copy = getAuthCopy(locale);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-plum-900">
          {status.enrolled ? copy.mfaVerifyTitle : copy.mfaEnrollTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {status.enrolled ? copy.mfaVerifyBody : copy.mfaEnrollBody}
        </p>
      </header>

      {/* Form — branched on enrollment state */}
      <div className="rounded-xl border border-stone-200 bg-white px-6 py-7 shadow-sm">
        {status.enrolled ? (
          <TotpVerifyForm locale={locale} copy={copy} />
        ) : (
          <TotpEnrollForm locale={locale} copy={copy} />
        )}
      </div>
    </main>
  );
}

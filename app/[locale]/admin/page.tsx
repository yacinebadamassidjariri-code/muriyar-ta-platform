import { CheckCircle2, ShieldAlert } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getAdminCopy } from "@/components/admin/content";
import { getProfile } from "@/lib/auth/session";
import {
  getStaffMfaStatus,
  isAdminMfaEnforcementEnabled,
} from "@/lib/auth/mfa-server";
import { adminNav } from "@/lib/constants/navigation";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getAdminCopy(locale);
  const [profile, mfa] = await Promise.all([getProfile(), getStaffMfaStatus()]);
  if (!profile) return null;

  const areas = adminNav.filter(
    (item) =>
      item.href !== "/admin" && profile.permissions.includes(item.permission),
  );
  const mfaLabel = mfa.verifiedForSession
    ? copy.mfaVerified
    : mfa.enrolled
      ? copy.mfaEnrolled
      : copy.mfaMissing;

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-plum-600">
          {profile.roles.map((role) => copy.role[role]).join(" · ")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-plum-900">
          {copy.overviewTitle}
        </h1>
        <p className="mt-3 leading-7 text-stone-700">{copy.overviewBody}</p>
      </header>

      <section aria-labelledby="available-areas">
        <h2 id="available-areas" className="text-lg font-bold text-charcoal-900">
          {copy.availableAreas}
        </h2>
        <p className="mt-1 text-sm text-stone-600">{copy.availableAreasBody}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-20 items-center rounded-lg border border-stone-100 bg-cream-50 px-5 font-semibold text-plum-900 shadow-editorial-xs transition-colors hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                {copy.nav[item.key]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="security-status">
        <h2 id="security-status" className="text-lg font-bold text-charcoal-900">
          {copy.securityStatus}
        </h2>
        <dl className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-100 bg-cream-50 px-5">
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="font-medium text-stone-700">{copy.activeProfile}</dt>
            <dd className="inline-flex items-center gap-2 text-sm font-semibold text-success-700">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {copy.active}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="font-medium text-stone-700">{copy.roleModel}</dt>
            <dd className="text-right text-sm font-semibold text-stone-700">
              {profile.roles.length} {copy.roles.toLowerCase()}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="font-medium text-stone-700">{copy.mfa}</dt>
            <dd className="text-right text-sm font-semibold text-stone-700">
              {mfaLabel}
            </dd>
          </div>
        </dl>
      </section>

      {!isAdminMfaEnforcementEnabled() ? (
        <aside className="flex gap-3 rounded-lg border border-warning-500/30 bg-warning-50 p-4 text-sm text-warning-700">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{copy.mfaAdvisory}</p>
        </aside>
      ) : null}

      <p className="border-t border-stone-100 pt-5 text-sm text-stone-600">
        {copy.foundationNotice}
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { listOrganizations, type OrgPartnershipStatus } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Répertoire des organisations" : "Organizations Directory" };
}

const STATUS_LABELS: Record<OrgPartnershipStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Active",
  PAUSED: "Paused",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

const STATUS_CLASSES: Record<OrgPartnershipStatus, string> = {
  PROSPECT: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-stone-200 text-stone-600",
  ARCHIVED: "bg-stone-100 text-stone-500",
};

export default async function OrganizationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const page = parseInt(sp.page ?? "1", 10) || 1;
  const status = (sp.status as OrgPartnershipStatus | undefined) || null;
  const q = sp.q?.trim() || undefined;

  const result = await listOrganizations({ q, status, page });

  const statuses: OrgPartnershipStatus[] = ["PROSPECT", "ACTIVE", "PAUSED", "INACTIVE"];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Organizations</h1>
          <p className="mt-1 text-ink-soft">
            Institutional partners and prospects in the commercial directory.
          </p>
        </div>
        <Link
          href="/admin/partnerships/organizations/new"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800"
        >
          Add organization
        </Link>
      </header>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label htmlFor="q" className="block text-xs font-semibold text-ink-soft mb-1">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Organization name…"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-semibold text-ink-soft mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[38px] items-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
        >
          Filter
        </button>
      </form>

      {/* Results */}
      {!result.ok ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Organizations could not be loaded. Try again or contact an administrator.
        </p>
      ) : result.value.items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No organizations yet</h2>
          <p className="mt-2 text-ink-soft">
            {q || status
              ? "No organizations match those filters."
              : "Add your first institutional partner or prospect to get started."}
          </p>
          {!q && !status && (
            <Link
              href="/admin/partnerships/organizations/new"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800"
            >
              Add organization
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                    Organization
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
                    Type / country
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                    Focus
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
                    Follow-up
                  </th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {result.value.items.map((org) => (
                  <tr key={org.org_id} className="hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/partnerships/organizations/${org.org_id}`}
                        className="font-semibold text-plum-700 hover:underline"
                      >
                        {org.name}
                      </Link>
                      {org.website && (
                        <p className="mt-0.5 text-xs text-ink-soft">{org.website}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                      {[org.org_type, org.country].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                      {org.geographic_focus ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                          STATUS_CLASSES[org.partnership_status]
                        }`}
                      >
                        {STATUS_LABELS[org.partnership_status]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                      {org.next_followup_date
                        ? new Date(org.next_followup_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/partnerships/organizations/${org.org_id}`}
                        className="text-xs font-semibold text-plum-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line bg-surface px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-ink-soft">
                {result.value.total} organization{result.value.total !== 1 ? "s" : ""}
              </p>
              {result.value.pageCount > 1 && (
                <div className="flex gap-2 text-xs font-semibold">
                  {page > 1 && (
                    <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page - 1) })}`} className="text-plum-700 hover:underline">
                      ← Previous
                    </Link>
                  )}
                  <span className="text-ink-soft">Page {page} of {result.value.pageCount}</span>
                  {page < result.value.pageCount && (
                    <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) })}`} className="text-plum-700 hover:underline">
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

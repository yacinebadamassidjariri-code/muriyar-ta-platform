import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { listBriefs, type BriefStatus } from "@/lib/data/admin/insights";
import { BriefStatusBadge } from "@/components/admin/insights/brief-status-badge";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<BriefStatus>([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Toutes les synthèses" : "All Briefs" };
}

export default async function BriefsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("insight.brief.read");

  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const rawStatus = one(sp.status) ?? "";
  const status = VALID_STATUSES.has(rawStatus as BriefStatus)
    ? (rawStatus as BriefStatus)
    : null;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const result = await listBriefs({ q, status, page });

  const statusLabels: Record<BriefStatus, string> = {
    DRAFT: "Draft",
    IN_REVIEW: "In review",
    APPROVED: "Approved",
    PUBLISHED: "Published",
    ARCHIVED: "Archived",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">All Briefs</h1>
          <p className="mt-2 text-ink-soft">
            {result.ok ? `${result.value.total} briefs` : "Institutional research briefs"}
          </p>
        </div>
        <Link
          href="/admin/insights/briefs/new"
          className="inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          Create brief
        </Link>
      </header>

      {/* Filters */}
      <form
        method="get"
        action={`/${locale}/admin/insights/briefs`}
        className="flex flex-wrap gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          <option value="">All statuses</option>
          {(Object.entries(statusLabels) as [BriefStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          Filter
        </button>
        {(q || status) && (
          <Link
            href="/admin/insights/briefs"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-4 text-sm text-ink-soft hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Clear
          </Link>
        )}
      </form>

      {!result.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Briefs could not be loaded. Try again or contact an administrator.
        </p>
      ) : result.value.items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {q || status ? "No briefs match this filter" : "No briefs yet"}
          </h2>
          <p className="mt-2 text-ink-soft">
            {q || status
              ? "Try a different search or filter."
              : "Create your first institutional research brief to get started."}
          </p>
          {!q && !status && (
            <Link
              href="/admin/insights/briefs/new"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              Create brief
            </Link>
          )}
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Title
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
                  Theme
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                  Updated
                </th>
                <th className="sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {result.value.items.map((brief) => (
                <tr key={brief.brief_id} className="hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/insights/briefs/${brief.brief_id}`}
                      className="font-semibold text-ink hover:text-plum-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                    >
                      {brief.title}
                    </Link>
                    {brief.is_sample && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-800">
                        Sample
                      </span>
                    )}
                    {brief.org_name && (
                      <p className="mt-0.5 text-xs text-ink-soft">{brief.org_name}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {brief.research_theme ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <BriefStatusBadge status={brief.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                    {new Date(brief.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/insights/briefs/${brief.brief_id}`}
                      className="text-xs font-semibold text-plum-700 hover:text-plum-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.value.pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3">
              <p className="text-xs text-ink-soft">
                Page {result.value.page} of {result.value.pageCount} —{" "}
                {result.value.total} briefs
              </p>
              <div className="flex gap-2">
                {result.value.page > 1 && (
                  <Link
                    href={`/admin/insights/briefs?${new URLSearchParams({ q, status: status ?? "", page: String(result.value.page - 1) })}`}
                    className="min-h-9 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-plum-50"
                  >
                    Previous
                  </Link>
                )}
                {result.value.page < result.value.pageCount && (
                  <Link
                    href={`/admin/insights/briefs?${new URLSearchParams({ q, status: status ?? "", page: String(result.value.page + 1) })}`}
                    className="min-h-9 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-plum-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

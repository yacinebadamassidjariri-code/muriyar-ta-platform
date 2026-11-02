import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { listOpportunities, type PipelineStage } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Pipeline commercial" : "Commercial Pipeline" };
}

const STAGES: { stage: PipelineStage; label: string }[] = [
  { stage: "LEAD", label: "Lead" },
  { stage: "CONTACTED", label: "Contacted" },
  { stage: "DISCOVERY", label: "Discovery" },
  { stage: "PROPOSAL_SENT", label: "Proposal sent" },
  { stage: "NEGOTIATION", label: "Negotiation" },
  { stage: "WON", label: "Won" },
  { stage: "LOST", label: "Lost" },
];

const STAGE_CLASSES: Record<PipelineStage, string> = {
  LEAD: "bg-sky-100 text-sky-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  DISCOVERY: "bg-violet-100 text-violet-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-stone-200 text-stone-600",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string; orgId?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const stage = (sp.stage as PipelineStage | undefined) || null;
  const orgId = sp.orgId?.trim() || null;
  const page = parseInt(sp.page ?? "1", 10) || 1;

  const result = await listOpportunities({ stage, orgId, page });

  const items = result.ok ? result.value.items : [];
  const total = result.ok ? result.value.total : 0;
  const totalValue = items
    .filter((o) => o.stage !== "LOST")
    .reduce((sum, o) => sum + (o.estimated_value_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Commercial Pipeline</h1>
          <p className="mt-1 text-ink-soft">
            Track institutional opportunities from first contact to won or lost.
          </p>
        </div>
        <Link
          href="/admin/partnerships/opportunities/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-plum-700 px-4 text-sm font-semibold text-white hover:bg-plum-800"
        >
          + Add opportunity
        </Link>
      </header>

      {/* Summary bar */}
      {result.ok && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
          <span className="text-ink-soft">
            <strong className="text-ink">{total}</strong> opportunities
          </span>
          {totalValue > 0 && (
            <span className="text-ink-soft">
              <strong className="text-ink">{usd(totalValue)}</strong> estimated (exc. lost)
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="stage" className="block text-xs font-semibold text-ink-soft mb-1">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={stage ?? ""}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s.stage} value={s.stage}>
                {s.label}
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

      {/* Table */}
      {!result.ok ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Pipeline could not be loaded.
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No opportunities yet</h2>
          <p className="mt-2 text-ink-soft">
            {stage ? `No opportunities in stage: ${stage}.` : "Add your first opportunity to track the commercial pipeline."}
          </p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Opportunity
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Stage
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                  Est. value
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
                  Close date
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
                  Follow-up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {items.map((opp) => (
                <tr key={opp.opportunity_id} className="hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{opp.title}</p>
                    {opp.research_theme && (
                      <p className="mt-0.5 text-xs text-ink-soft">{opp.research_theme}</p>
                    )}
                    {opp.package_name && (
                      <p className="mt-0.5 text-xs text-ink-soft">📦 {opp.package_name}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Link
                      href={`/admin/partnerships/organizations/${opp.org_id}`}
                      className="font-medium text-plum-700 hover:underline"
                    >
                      {opp.org_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        STAGE_CLASSES[opp.stage]
                      }`}
                    >
                      {STAGES.find((s) => s.stage === opp.stage)?.label ?? opp.stage}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-ink md:table-cell">
                    {opp.estimated_value_usd != null ? usd(opp.estimated_value_usd) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                    {opp.expected_close_date
                      ? new Date(opp.expected_close_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                    {opp.next_followup_date
                      ? new Date(opp.next_followup_date).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-surface px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-ink-soft">
              {total} opportunit{total !== 1 ? "ies" : "y"}
            </p>
            {result.value.pageCount > 1 && (
              <div className="flex gap-2 text-xs font-semibold">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...(stage ? { stage } : {}), page: String(page - 1) })}`} className="text-plum-700 hover:underline">
                    ← Previous
                  </Link>
                )}
                <span className="text-ink-soft">Page {page} of {result.value.pageCount}</span>
                {page < result.value.pageCount && (
                  <Link href={`?${new URLSearchParams({ ...(stage ? { stage } : {}), page: String(page + 1) })}`} className="text-plum-700 hover:underline">
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

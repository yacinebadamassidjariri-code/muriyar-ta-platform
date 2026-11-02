import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listProposals, type ProposalStatus } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Propositions" : "Proposals" };
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  SUPERSEDED: "Superseded",
};

const STATUS_CLASSES: Record<ProposalStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-stone-200 text-stone-500",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; orgId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const status = (sp.status as ProposalStatus | undefined) || null;
  const orgId = sp.orgId?.trim() || null;

  const result = await listProposals({ status, orgId });
  const items = result.ok ? result.value : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Proposals</h1>
        <p className="mt-1 text-ink-soft">
          Commercial proposals sent to institutional partners and prospects.
        </p>
      </header>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
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
            {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map((s) => (
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

      {!result.ok ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Proposals could not be loaded.
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No proposals yet</h2>
          <p className="mt-2 text-ink-soft">
            {status ? `No proposals with status: ${STATUS_LABELS[status]}.` : "Create proposals from commercial opportunities."}
          </p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Proposal
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                  Value
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {items.map((p) => (
                <tr key={p.proposal_id} className="hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{p.title}</p>
                    <p className="mt-0.5 text-xs font-mono text-ink-soft">{p.proposal_number}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {p.org_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        STATUS_CLASSES[p.status]
                      }`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-ink md:table-cell">
                    {p.quoted_price_usd != null ? usd(p.quoted_price_usd) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                    {p.sent_at ? new Date(p.sent_at).toLocaleDateString() : "Not sent"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-surface px-4 py-3">
            <p className="text-xs text-ink-soft">
              {items.length} proposal{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listContracts, type ContractStatus } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Contrats" : "Contracts" };
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: "Draft",
  SIGNED: "Signed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
};

const STATUS_CLASSES: Record<ContractStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  SIGNED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-plum-100 text-plum-800",
  TERMINATED: "bg-red-100 text-red-800",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ContractsPage({
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

  const status = (sp.status as ContractStatus | undefined) || null;
  const orgId = sp.orgId?.trim() || null;

  const result = await listContracts({ status, orgId });
  const items = result.ok ? result.value : [];

  const totalValue = items
    .filter((c) => c.status === "ACTIVE" || c.status === "SIGNED")
    .reduce((sum, c) => sum + c.contract_value_usd, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Contracts</h1>
        <p className="mt-1 text-ink-soft">
          Signed agreements and active service contracts with institutional partners.
        </p>
      </header>

      {result.ok && totalValue > 0 && (
        <div className="rounded-xl border border-line bg-surface p-4 text-sm">
          <span className="text-ink-soft">Active/signed contract value: </span>
          <strong className="text-ink">{usd(totalValue)}</strong>
        </div>
      )}

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
            {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
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
          Contracts could not be loaded.
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No contracts yet</h2>
          <p className="mt-2 text-ink-soft">
            {status ? `No contracts with status: ${STATUS_LABELS[status]}.` : "Contracts are created when a proposal is accepted."}
          </p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Contract
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
                  Period
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {items.map((c) => (
                <tr key={c.contract_id} className="hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="mt-0.5 text-xs font-mono text-ink-soft">{c.contract_number}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {c.org_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        STATUS_CLASSES[c.status]
                      }`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-ink md:table-cell">
                    {usd(c.contract_value_usd)}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                    {c.start_date && c.end_date
                      ? `${new Date(c.start_date).toLocaleDateString()} – ${new Date(c.end_date).toLocaleDateString()}`
                      : c.start_date
                        ? `From ${new Date(c.start_date).toLocaleDateString()}`
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-surface px-4 py-3">
            <p className="text-xs text-ink-soft">
              {items.length} contract{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Contract documents</p>
        <p className="mt-1 text-sm text-amber-800">
          Contract value figures are derived from database records and do not substitute for
          signed legal documents. Contract files are stored externally and referenced by
          contract number. Always verify the executed document before actioning a payment.
        </p>
      </div>
    </div>
  );
}

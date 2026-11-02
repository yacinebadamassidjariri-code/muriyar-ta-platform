import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listInvoices, type InvoiceStatus } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Factures" : "Invoices" };
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  ISSUED: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-stone-200 text-stone-500",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function InvoicesPage({
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

  const status = (sp.status as InvoiceStatus | undefined) || null;
  const orgId = sp.orgId?.trim() || null;

  const result = await listInvoices({ status, orgId });
  const items = result.ok ? result.value : [];

  const totalIssued = items.reduce((sum, i) => sum + i.amount_usd, 0);
  const totalReceived = items.reduce((sum, i) => sum + i.paid_total, 0);
  const outstanding = items
    .filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + (i.amount_usd - i.paid_total), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Invoices</h1>
        <p className="mt-1 text-ink-soft">
          All invoices issued to institutional partners, with payment status.
        </p>
      </header>

      {result.ok && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Invoiced", value: usd(totalIssued) },
            { label: "Received", value: usd(totalReceived) },
            { label: "Outstanding", value: usd(outstanding) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {s.label}
              </dt>
              <dd className="mt-2 font-display text-2xl font-semibold text-ink">{s.value}</dd>
            </div>
          ))}
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
            {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
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
          Invoices could not be loaded.
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No invoices yet</h2>
          <p className="mt-2 text-ink-soft">
            {status ? `No invoices with status: ${STATUS_LABELS[status]}.` : "Invoices are created from active contracts."}
          </p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Invoice
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft sm:table-cell">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                  Amount
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft md:table-cell">
                  Received
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft lg:table-cell">
                  Due
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {items.map((inv) => (
                <tr key={inv.invoice_id} className="hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{inv.title ?? inv.invoice_number}</p>
                    <p className="mt-0.5 text-xs font-mono text-ink-soft">{inv.invoice_number}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Issued {new Date(inv.issue_date).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {inv.org_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                        STATUS_CLASSES[inv.status]
                      }`}
                    >
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-ink md:table-cell">
                    {usd(inv.amount_usd)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-ink md:table-cell">
                    {inv.paid_total > 0 ? (
                      <span className={inv.paid_total >= inv.amount_usd ? "text-emerald-700 font-semibold" : "text-amber-700"}>
                        {usd(inv.paid_total)}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-surface px-4 py-3">
            <p className="text-xs text-ink-soft">
              {items.length} invoice{items.length !== 1 ? "s" : ""}. Figures reflect recorded
              payments only. Always reconcile against your accounting system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

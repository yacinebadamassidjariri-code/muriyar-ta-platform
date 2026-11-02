import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getInvoice, type InvoiceStatus, type InvoicePayment } from "@/lib/data/admin/partnerships";
import { recordPaymentAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; invoiceId: string }>;
}): Promise<Metadata> {
  const { invoiceId } = await params;
  const result = await getInvoice(invoiceId);
  return { title: result.ok ? (result.value.invoice_number) : "Invoice" };
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; invoiceId: string }>;
  searchParams: Promise<{ paymentError?: string }>;
}) {
  const { locale, invoiceId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const result = await getInvoice(invoiceId);
  if (!result.ok) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const invoice = (result as Extract<typeof result, { ok: true }>).value;

  const isPaid = invoice.status === "PAID" || invoice.status === "CANCELLED";
  const canRecord = !isPaid && invoice.balance_usd > 0;

  const today = new Date().toISOString().slice(0, 10);

  async function recordPayment(formData: FormData) {
    "use server";
    const actionResult = await recordPaymentAction(invoiceId, formData);
    if (actionResult.ok) {
      redirect(`/admin/partnerships/invoices/${invoiceId}`);
    } else {
      redirect(
        `/admin/partnerships/invoices/${invoiceId}?paymentError=${encodeURIComponent(actionResult.error)}`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/partnerships/invoices"
            className="text-xs font-semibold text-plum-700 hover:underline"
          >
            ← Invoices
          </Link>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
            {invoice.title ?? invoice.invoice_number}
          </h1>
          <p className="mt-0.5 font-mono text-xs text-ink-soft">{invoice.invoice_number}</p>
        </div>
        <span
          className={`mt-2 inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            STATUS_CLASSES[invoice.status] ?? "bg-stone-100 text-stone-700"
          }`}
        >
          {STATUS_LABELS[invoice.status]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice summary */}
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Invoice details
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Organization", invoice.org_name],
                ["Invoice number", invoice.invoice_number],
                ["Amount", usd(invoice.amount_usd)],
                ["Issued", new Date(invoice.issue_date).toLocaleDateString()],
                ["Due", invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"],
                ["Currency", invoice.currency],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Payment balance */}
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Payment summary
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Invoiced", value: usd(invoice.amount_usd), cls: "text-ink" },
                {
                  label: "Received",
                  value: usd(invoice.paid_total),
                  cls: invoice.paid_total > 0 ? "text-emerald-700" : "text-ink-soft",
                },
                {
                  label: "Balance",
                  value: usd(invoice.balance_usd),
                  cls:
                    invoice.balance_usd === 0
                      ? "text-emerald-700"
                      : invoice.status === "OVERDUE"
                        ? "text-red-700"
                        : "text-amber-700",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-line p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                    {s.label}
                  </dt>
                  <dd className={`mt-1 font-display text-xl font-semibold ${s.cls}`}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </div>
          </section>

          {/* Payment history */}
          {invoice.payments.length > 0 && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Payments recorded ({invoice.payments.length})
              </h2>
              <div className="mt-3 divide-y divide-line">
                {invoice.payments.map((p: InvoicePayment) => (
                  <div key={p.payment_id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {new Date(p.payment_date).toLocaleDateString()}
                      </p>
                      {p.reference && (
                        <p className="mt-0.5 text-xs font-mono text-ink-soft">
                          Ref: {p.reference}
                        </p>
                      )}
                      {p.notes && (
                        <p className="mt-0.5 text-xs text-ink-soft">{p.notes}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-700">
                      +{usd(p.amount_usd)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Record payment form */}
          {canRecord && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Record a payment
              </h2>
              <p className="mt-1 text-xs text-ink-soft">
                Maximum recordable: <strong>{usd(invoice.balance_usd)}</strong>. Overpayments are
                not permitted.
              </p>

              {sp.paymentError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
                >
                  {decodeURIComponent(sp.paymentError)}
                </p>
              )}

              <form action={recordPayment} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="amount_usd"
                      className="block text-sm font-semibold text-ink mb-1"
                    >
                      Amount (USD){" "}
                      <span className="text-danger" aria-label="required">
                        *
                      </span>
                    </label>
                    <input
                      id="amount_usd"
                      name="amount_usd"
                      type="number"
                      required
                      min="0.01"
                      max={invoice.balance_usd}
                      step="0.01"
                      placeholder="0.00"
                      className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="payment_date"
                      className="block text-sm font-semibold text-ink mb-1"
                    >
                      Payment date
                    </label>
                    <input
                      id="payment_date"
                      name="payment_date"
                      type="date"
                      defaultValue={today}
                      className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reference"
                    className="block text-sm font-semibold text-ink mb-1"
                  >
                    Reference{" "}
                    <span className="text-xs font-normal text-ink-soft">
                      (bank ref, transaction ID, cheque no.)
                    </span>
                  </label>
                  <input
                    id="reference"
                    name="reference"
                    type="text"
                    placeholder="e.g. SWIFT-2026-11020001"
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-semibold text-ink mb-1"
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    placeholder="e.g. Partial payment — instalment 1 of 2"
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  Record payment
                </button>
              </form>
            </section>
          )}

          {!canRecord && !isPaid && invoice.balance_usd === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              This invoice has been paid in full.
            </div>
          )}

          {invoice.status === "CANCELLED" && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              This invoice is cancelled. No further payments can be recorded.
            </div>
          )}

          {invoice.internal_notes && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Internal notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                {invoice.internal_notes}
              </p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Record
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Created</dt>
                <dd className="text-ink">{new Date(invoice.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Updated</dt>
                <dd className="text-ink">{new Date(invoice.updated_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          <Link
            href={`/admin/partnerships/organizations/${invoice.org_id}`}
            className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            View organization
          </Link>

          {invoice.contract_id && (
            <Link
              href={`/admin/partnerships/contracts/${invoice.contract_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View contract
            </Link>
          )}
        </aside>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Reconcile with your accounts</p>
        <p className="mt-1 text-sm text-amber-800">
          Payments recorded here reflect database entries only. Always reconcile against your
          accounting system and bank statements before closing a period. This system does not
          generate official accounting records.
        </p>
      </div>
    </div>
  );
}

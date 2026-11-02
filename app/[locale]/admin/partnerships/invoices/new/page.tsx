import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listOrganizations, listContracts } from "@/lib/data/admin/partnerships";
import { createInvoiceAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "New Invoice" };
}

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contractId?: string; orgId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  const [orgsResult, contractsResult] = await Promise.all([
    listOrganizations({}),
    listContracts({}),
  ]);

  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const contracts = contractsResult.ok ? contractsResult.value : [];

  const preselectedContractId = sp.contractId?.trim() || "";
  const preselectedOrgId = sp.orgId?.trim() || "";

  // If a contractId was passed, find the org from the contract list for convenience
  const preselectedContract = contracts.find((c) => c.contract_id === preselectedContractId);

  // Today's date as default issue date
  const today = new Date().toISOString().slice(0, 10);

  async function createInvoice(formData: FormData) {
    "use server";
    const contractId = (formData.get("contract_id") as string | null) || "";
    const orgId = (formData.get("org_id") as string | null)?.trim() || "";
    if (!orgId) return; // validation handled below
    const result = await createInvoiceAction(contractId, orgId, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/invoices/${result.value.invoice_id}`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="/admin/partnerships/invoices"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Invoices
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">New Invoice</h1>
        <p className="mt-1 text-ink-soft">
          Invoice numbers are generated automatically in the format{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">MT-YYYY-NNN</code>.
        </p>
      </header>

      <form action={createInvoice} className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Invoice details
          </h2>

          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-ink mb-1">
              Invoice title{" "}
              <span className="text-xs font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Girls Education Brief — Phase 1 Delivery"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div>
            <label htmlFor="org_id" className="block text-sm font-semibold text-ink mb-1">
              Organization <span className="text-danger" aria-label="required">*</span>
            </label>
            <select
              id="org_id"
              name="org_id"
              required
              defaultValue={preselectedContract?.org_name ? preselectedOrgId : preselectedOrgId}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              <option value="">— Select organization —</option>
              {orgs.map((org) => (
                <option key={org.org_id} value={org.org_id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contract_id" className="block text-sm font-semibold text-ink mb-1">
              Contract{" "}
              <span className="text-xs font-normal text-ink-soft">(optional — required for sequence)</span>
            </label>
            <select
              id="contract_id"
              name="contract_id"
              defaultValue={preselectedContractId}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              <option value="">— None —</option>
              {contracts.map((c) => (
                <option key={c.contract_id} value={c.contract_id}>
                  {c.contract_number} — {c.title} ({c.org_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="amount_usd" className="block text-sm font-semibold text-ink mb-1">
              Amount (USD) <span className="text-danger" aria-label="required">*</span>
            </label>
            <input
              id="amount_usd"
              name="amount_usd"
              type="number"
              required
              min="1"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue_date" className="block text-sm font-semibold text-ink mb-1">
                Issue date
              </label>
              <input
                id="issue_date"
                name="issue_date"
                type="date"
                defaultValue={today}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label htmlFor="due_date" className="block text-sm font-semibold text-ink mb-1">
                Due date
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold text-blue-900">Sequential invoice numbering</p>
          <p className="mt-1">
            The invoice number will be assigned automatically when you submit this form.
            Numbers are sequential within each calendar year (e.g.{" "}
            <code className="rounded bg-blue-100 px-1">MT-2026-001</code>). Once assigned,
            the number cannot be changed.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Create invoice
          </button>
          <a
            href="/admin/partnerships/invoices"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

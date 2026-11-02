import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getContract, listOrganizations, listOpportunities, listProposals } from "@/lib/data/admin/partnerships";
import { saveContractAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; contractId: string }>;
}): Promise<Metadata> {
  const { contractId } = await params;
  const result = await getContract(contractId);
  return { title: result.ok ? result.value.title : "Contract" };
}

const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SIGNED", label: "Signed" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

const STATUS_CLASSES: Record<string, string> = {
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

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; contractId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale, contractId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const [contractResult, orgsResult, oppsResult, proposalsResult] = await Promise.all([
    getContract(contractId),
    listOrganizations({}),
    listOpportunities({}),
    listProposals({}),
  ]);

  if (!contractResult.ok) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const contract = (contractResult as Extract<typeof contractResult, { ok: true }>).value;
  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const opps = oppsResult.ok ? oppsResult.value.items : [];
  const proposals = proposalsResult.ok ? proposalsResult.value : [];
  const isEditing = sp.edit === "1";

  const statusLabel = CONTRACT_STATUSES.find((s) => s.value === contract.status)?.label ?? contract.status;

  async function updateContract(formData: FormData) {
    "use server";
    const result = await saveContractAction(contractId, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/contracts/${contractId}`);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/partnerships/contracts"
            className="text-xs font-semibold text-plum-700 hover:underline"
          >
            ← Contracts
          </Link>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">{contract.title}</h1>
          <p className="mt-1 font-mono text-xs text-ink-soft">{contract.contract_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              STATUS_CLASSES[contract.status] ?? "bg-stone-100 text-stone-700"
            }`}
          >
            {statusLabel}
          </span>
          {!isEditing && (
            <a
              href="?edit=1"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              Edit
            </a>
          )}
        </div>
      </header>

      {/* Legal review notice — always shown */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-2xl">
        <p className="text-sm font-semibold text-amber-900">Legal review required</p>
        <p className="mt-1 text-sm text-amber-800">
          This record reflects contract terms entered by staff. Always verify against the
          executed legal document before actioning payments or deliverables.
        </p>
      </div>

      {isEditing ? (
        /* ------------------------------------------------------------------ */
        /* Edit form                                                           */
        /* ------------------------------------------------------------------ */
        <form action={updateContract} className="space-y-6 max-w-2xl">
          <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Contract details
            </h2>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-ink mb-1">
                Title <span className="text-danger" aria-label="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={contract.title}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contract_number" className="block text-sm font-semibold text-ink mb-1">
                  Contract number <span className="text-danger" aria-label="required">*</span>
                </label>
                <input
                  id="contract_number"
                  name="contract_number"
                  type="text"
                  required
                  defaultValue={contract.contract_number}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-ink mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={contract.status}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  {CONTRACT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="org_id" className="block text-sm font-semibold text-ink mb-1">
                Organization <span className="text-danger" aria-label="required">*</span>
              </label>
              <select
                id="org_id"
                name="org_id"
                required
                defaultValue={contract.org_id}
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
              <label htmlFor="contract_value_usd" className="block text-sm font-semibold text-ink mb-1">
                Contract value (USD) <span className="text-danger" aria-label="required">*</span>
              </label>
              <input
                id="contract_value_usd"
                name="contract_value_usd"
                type="number"
                required
                min="0"
                step="100"
                defaultValue={contract.contract_value_usd}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="contract_date" className="block text-sm font-semibold text-ink mb-1">
                  Contract date
                </label>
                <input
                  id="contract_date"
                  name="contract_date"
                  type="date"
                  defaultValue={contract.contract_date ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
              <div>
                <label htmlFor="start_date" className="block text-sm font-semibold text-ink mb-1">
                  Start date
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={contract.start_date ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-semibold text-ink mb-1">
                  End date
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={contract.end_date ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opportunity_id" className="block text-sm font-semibold text-ink mb-1">
                  Opportunity
                </label>
                <select
                  id="opportunity_id"
                  name="opportunity_id"
                  defaultValue={contract.opportunity_id ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  <option value="">— None —</option>
                  {opps.map((opp) => (
                    <option key={opp.opportunity_id} value={opp.opportunity_id}>
                      {opp.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="proposal_id" className="block text-sm font-semibold text-ink mb-1">
                  Proposal
                </label>
                <select
                  id="proposal_id"
                  name="proposal_id"
                  defaultValue={contract.proposal_id ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  <option value="">— None —</option>
                  {proposals.map((p) => (
                    <option key={p.proposal_id} value={p.proposal_id}>
                      {p.proposal_number} — {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="deliverables" className="block text-sm font-semibold text-ink mb-1">
                Deliverables
              </label>
              <textarea
                id="deliverables"
                name="deliverables"
                rows={4}
                defaultValue={contract.deliverables ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div>
              <label htmlFor="obligations" className="block text-sm font-semibold text-ink mb-1">
                Client obligations
              </label>
              <textarea
                id="obligations"
                name="obligations"
                rows={3}
                defaultValue={contract.obligations ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>

            <div>
              <label htmlFor="internal_notes" className="block text-sm font-semibold text-ink mb-1">
                Internal notes
              </label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                rows={3}
                defaultValue={contract.internal_notes ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              Save changes
            </button>
            <a
              href={`/admin/partnerships/contracts/${contractId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              Cancel
            </a>
          </div>
        </form>
      ) : (
        /* ------------------------------------------------------------------ */
        /* Read view                                                           */
        /* ------------------------------------------------------------------ */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Details
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Organization", contract.org_name],
                  ["Value", usd(contract.contract_value_usd)],
                  ["Contract date", contract.contract_date ? new Date(contract.contract_date).toLocaleDateString() : "—"],
                  ["Signed", contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : "—"],
                  ["Start date", contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"],
                  ["End date", contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {contract.deliverables && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Deliverables
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{contract.deliverables}</p>
              </section>
            )}

            {contract.obligations && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Client obligations
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{contract.obligations}</p>
              </section>
            )}

            {contract.internal_notes && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Internal notes
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{contract.internal_notes}</p>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Record
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Created</dt>
                  <dd className="text-ink">{new Date(contract.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Updated</dt>
                  <dd className="text-ink">{new Date(contract.updated_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </section>

            <Link
              href={`/admin/partnerships/organizations/${contract.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View organization
            </Link>

            <Link
              href={`/admin/partnerships/invoices?contractId=${contractId}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View invoices
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

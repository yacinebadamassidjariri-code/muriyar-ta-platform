import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listOrganizations, listOpportunities, listProposals } from "@/lib/data/admin/partnerships";
import { saveContractAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "New Contract" };
}

const CONTRACT_STATUSES = ["DRAFT", "SIGNED", "ACTIVE", "COMPLETED", "TERMINATED"] as const;

export default async function NewContractPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  const [orgsResult, oppsResult, proposalsResult] = await Promise.all([
    listOrganizations({}),
    listOpportunities({}),
    listProposals({}),
  ]);

  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const opps = oppsResult.ok ? oppsResult.value.items : [];
  const proposals = proposalsResult.ok ? proposalsResult.value : [];

  async function createContract(formData: FormData) {
    "use server";
    const result = await saveContractAction(null, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/contracts/${result.value.contract_id}`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="/admin/partnerships/contracts"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Contracts
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          New Contract
        </h1>
      </header>

      {/* Legal-review notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-2xl">
        <p className="text-sm font-semibold text-amber-900">Legal review required</p>
        <p className="mt-1 text-sm text-amber-800">
          Contract terms must be reviewed and approved by the Programme Director and legal
          counsel before execution. This form records a contract reference — it does not
          constitute a legally binding agreement. Always attach the executed contract document
          to the contract record after signing.
        </p>
      </div>

      <form action={createContract} className="space-y-6 max-w-2xl">
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
              placeholder="e.g. Girls Education Brief — UNICEF Kenya 2027"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
                placeholder="e.g. MT-C-2027-001"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="DRAFT"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
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
              placeholder="0"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Linked records
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="opportunity_id" className="block text-sm font-semibold text-ink mb-1">
                Opportunity
              </label>
              <select
                id="opportunity_id"
                name="opportunity_id"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                <option value="">— None —</option>
                {opps.map((opp) => (
                  <option key={opp.opportunity_id} value={opp.opportunity_id}>
                    {opp.title} ({opp.org_name})
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
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Scope &amp; obligations
          </h2>

          <div>
            <label htmlFor="deliverables" className="block text-sm font-semibold text-ink mb-1">
              Deliverables
            </label>
            <textarea
              id="deliverables"
              name="deliverables"
              rows={4}
              placeholder="Key deliverables as described in the contract…"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
              placeholder="What the partner organization is required to provide…"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
              placeholder="Negotiation notes, relationship context, risk flags…"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Create contract
          </button>
          <a
            href="/admin/partnerships/contracts"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { saveProposalAction } from "@/lib/actions/admin/partnerships";
import { listOrganizations, listServicePackages } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "New Proposal" };
}

const PROPOSAL_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;

export default async function NewProposalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.edit");

  const [orgsResult, packagesResult] = await Promise.all([
    listOrganizations({}),
    listServicePackages(),
  ]);

  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const packages = packagesResult.ok ? packagesResult.value : [];

  async function createProposal(formData: FormData) {
    "use server";
    const result = await saveProposalAction(null, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/proposals`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="/admin/partnerships/proposals"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Proposals
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          New Proposal
        </h1>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-2xl">
        <p className="text-sm font-semibold text-amber-900">Pricing notice</p>
        <p className="mt-1 text-sm text-amber-800">
          All prices in proposals are provisional until approved by the Programme Director.
          Proposals do not constitute a binding offer. Include the standard safeguarding
          and limitations statement before sending to a partner.
        </p>
      </div>

      <form action={createProposal} className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Proposal details
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="package_id" className="block text-sm font-semibold text-ink mb-1">
                Service package
              </label>
              <select
                id="package_id"
                name="package_id"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                <option value="">— None —</option>
                {packages.map((pkg) => (
                  <option key={pkg.package_id} value={pkg.package_id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quoted_price_usd" className="block text-sm font-semibold text-ink mb-1">
                Quoted price (USD)
              </label>
              <input
                id="quoted_price_usd"
                name="quoted_price_usd"
                type="number"
                min="0"
                step="100"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-ink mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              {PROPOSAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scope_description" className="block text-sm font-semibold text-ink mb-1">
              Scope description
            </label>
            <textarea
              id="scope_description"
              name="scope_description"
              rows={4}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div>
            <label htmlFor="sent_at" className="block text-sm font-semibold text-ink mb-1">
              Sent date
            </label>
            <input
              id="sent_at"
              name="sent_at"
              type="date"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Create proposal
          </button>
          <a
            href="/admin/partnerships/proposals"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

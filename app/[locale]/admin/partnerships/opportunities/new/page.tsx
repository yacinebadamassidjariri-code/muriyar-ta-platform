import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { saveOpportunityAction } from "@/lib/actions/admin/partnerships";
import { listOrganizations, listServicePackages } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "New Opportunity" };
}

const PIPELINE_STAGES = [
  "LEAD", "CONTACTED", "DISCOVERY", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST",
] as const;

export default async function NewOpportunityPage({
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

  async function createOpportunity(formData: FormData) {
    "use server";
    const result = await saveOpportunityAction(null, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/pipeline`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <a
          href="/admin/partnerships/pipeline"
          className="text-xs font-semibold text-plum-700 hover:underline"
        >
          ← Pipeline
        </a>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
          New Opportunity
        </h1>
      </header>

      <form action={createOpportunity} className="space-y-6 max-w-2xl">
        <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Opportunity details
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
              placeholder="e.g. Girls Education Brief — UNICEF Kenya"
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
              <label htmlFor="stage" className="block text-sm font-semibold text-ink mb-1">
                Stage
              </label>
              <select
                id="stage"
                name="stage"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="estimated_value_usd" className="block text-sm font-semibold text-ink mb-1">
                Estimated value (USD)
              </label>
              <input
                id="estimated_value_usd"
                name="estimated_value_usd"
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 2200"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>

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
                  {pkg.base_price_usd != null ? ` ($${Number(pkg.base_price_usd).toLocaleString()})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="research_theme" className="block text-sm font-semibold text-ink mb-1">
              Research theme
            </label>
            <input
              id="research_theme"
              name="research_theme"
              type="text"
              placeholder="e.g. Girls education, Child marriage"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expected_close_date" className="block text-sm font-semibold text-ink mb-1">
                Expected close date
              </label>
              <input
                id="expected_close_date"
                name="expected_close_date"
                type="date"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
            <div>
              <label htmlFor="next_followup_date" className="block text-sm font-semibold text-ink mb-1">
                Next follow-up
              </label>
              <input
                id="next_followup_date"
                name="next_followup_date"
                type="date"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="internal_notes" className="block text-sm font-semibold text-ink mb-1">
              Internal notes
            </label>
            <textarea
              id="internal_notes"
              name="internal_notes"
              rows={3}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-plum-700 px-6 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            Create opportunity
          </button>
          <a
            href="/admin/partnerships/pipeline"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-6 text-sm font-semibold text-ink hover:bg-plum-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

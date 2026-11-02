import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getOpportunity, listOrganizations, listServicePackages } from "@/lib/data/admin/partnerships";
import { saveOpportunityAction } from "@/lib/actions/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; opportunityId: string }>;
}): Promise<Metadata> {
  const { opportunityId } = await params;
  const result = await getOpportunity(opportunityId);
  return { title: result.ok ? result.value.title : "Opportunity" };
}

const PIPELINE_STAGES = [
  { value: "LEAD", label: "Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DISCOVERY", label: "Discovery" },
  { value: "PROPOSAL_SENT", label: "Proposal sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const;

const STAGE_CLASSES: Record<string, string> = {
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

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; opportunityId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale, opportunityId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const [oppResult, orgsResult, packagesResult] = await Promise.all([
    getOpportunity(opportunityId),
    listOrganizations({}),
    listServicePackages(),
  ]);

  if (!oppResult.ok) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const opp = (oppResult as Extract<typeof oppResult, { ok: true }>).value;

  const orgs = orgsResult.ok ? orgsResult.value.items : [];
  const packages = packagesResult.ok ? packagesResult.value : [];
  const isEditing = sp.edit === "1";

  async function updateOpportunity(formData: FormData) {
    "use server";
    const result = await saveOpportunityAction(opportunityId, formData);
    if (result.ok) {
      redirect(`/admin/partnerships/opportunities/${opportunityId}`);
    }
  }

  const stageLabel = PIPELINE_STAGES.find((s) => s.value === opp.stage)?.label ?? opp.stage;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/partnerships/pipeline"
            className="text-xs font-semibold text-plum-700 hover:underline"
          >
            ← Pipeline
          </Link>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">{opp.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{opp.org_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              STAGE_CLASSES[opp.stage] ?? "bg-stone-100 text-stone-700"
            }`}
          >
            {stageLabel}
          </span>
          {!isEditing && (
            <a
              href={`?edit=1`}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              Edit
            </a>
          )}
        </div>
      </header>

      {isEditing ? (
        /* ------------------------------------------------------------------ */
        /* Edit form                                                           */
        /* ------------------------------------------------------------------ */
        <form action={updateOpportunity} className="space-y-6 max-w-2xl">
          <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Edit opportunity
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
                defaultValue={opp.title}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
                defaultValue={opp.org_id}
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
                  defaultValue={opp.stage}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
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
                  defaultValue={opp.estimated_value_usd ?? ""}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
                defaultValue={opp.package_name
                  ? packages.find((p) => p.name === opp.package_name)?.package_id ?? ""
                  : ""}
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
                defaultValue={opp.research_theme ?? ""}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
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
                  defaultValue={opp.expected_close_date ?? ""}
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
                  defaultValue={opp.next_followup_date ?? ""}
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
                rows={4}
                defaultValue={opp.internal_notes ?? ""}
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
              href={`/admin/partnerships/opportunities/${opportunityId}`}
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
                  ["Research theme", opp.research_theme ?? "—"],
                  ["Estimated value", opp.estimated_value_usd != null ? usd(opp.estimated_value_usd) : "—"],
                  ["Expected close", opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : "—"],
                  ["Next follow-up", opp.next_followup_date ? new Date(opp.next_followup_date).toLocaleDateString() : "—"],
                  ["Service package", opp.package_name ?? "—"],
                  ["Assigned to", opp.assigned_to ?? "—"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {opp.internal_notes && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Internal notes
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{opp.internal_notes}</p>
              </section>
            )}

            {opp.stage_history.length > 0 && (
              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Stage history
                </h2>
                <ol className="mt-3 space-y-2">
                  {opp.stage_history.map((h: { stage: string; changed_at: string; changed_by: string | null }, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                          STAGE_CLASSES[h.stage] ?? "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {PIPELINE_STAGES.find((s) => s.value === h.stage)?.label ?? h.stage}
                      </span>
                      <span className="text-ink-soft">
                        {new Date(h.changed_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ol>
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
                  <dd className="text-ink">{new Date(opp.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Updated</dt>
                  <dd className="text-ink">{new Date(opp.updated_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </section>

            <Link
              href={`/admin/partnerships/organizations/${opp.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View organization
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getCommercialDashboard } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Partenariats & commercial" : "Partnerships & Commercial" };
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default async function PartnershipsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const dashResult = await getCommercialDashboard();
  const d = dashResult.ok
    ? dashResult.value
    : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">
          Partnerships & Commercial
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Track institutional organizations, the commercial pipeline, proposals,
          contracts, and financial records.
        </p>
      </header>

      {!dashResult.ok && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Dashboard metrics could not be loaded. Individual sections remain accessible.
        </p>
      )}

      {d && (
        <>
          {/* Organizations & pipeline */}
          <section aria-labelledby="pipeline-stats">
            <h2 id="pipeline-stats" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Pipeline
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Organizations", value: d.total_organizations, href: "/admin/partnerships/organizations" },
                { label: "Active partners", value: d.active_partners, href: "/admin/partnerships/organizations?status=ACTIVE" },
                { label: "Active opportunities", value: d.active_opportunities, href: "/admin/partnerships/pipeline" },
                { label: "Pipeline value", value: usd(d.pipeline_value_usd), href: "/admin/partnerships/pipeline" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="group rounded-xl border border-line bg-surface p-4 hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{s.label}</dt>
                  <dd className="mt-2 font-display text-2xl font-semibold text-ink group-hover:text-plum-800">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </section>

          {/* Financial */}
          <section aria-labelledby="financial-stats">
            <h2 id="financial-stats" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Financial
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Contracted", value: usd(d.total_contracted_usd), href: "/admin/partnerships/contracts" },
                { label: "Invoiced", value: usd(d.total_invoiced_usd), href: "/admin/partnerships/invoices" },
                { label: "Received", value: usd(d.total_received_usd), href: "/admin/partnerships/invoices" },
                { label: "Outstanding", value: usd(d.outstanding_usd), href: "/admin/partnerships/invoices?status=ISSUED" },
                { label: "Overdue", value: d.overdue_invoices, href: "/admin/partnerships/invoices?status=OVERDUE" },
                { label: "Follow-ups (7d)", value: d.followups_due_7d, href: "/admin/partnerships/pipeline" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="group rounded-xl border border-line bg-surface p-4 hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{s.label}</dt>
                  <dd className="mt-2 font-display text-2xl font-semibold text-ink group-hover:text-plum-800">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </section>

          {/* Proposals & contracts */}
          <section aria-labelledby="docs-stats">
            <h2 id="docs-stats" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Documents
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Proposals sent", value: d.proposals_sent, href: "/admin/partnerships/proposals?status=SENT" },
                { label: "Proposals accepted", value: d.proposals_accepted, href: "/admin/partnerships/proposals?status=ACCEPTED" },
                { label: "Active contracts", value: d.active_contracts, href: "/admin/partnerships/contracts" },
                { label: "Briefs published", value: d.briefs_published, href: "/admin/insights/briefs?status=PUBLISHED" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="group rounded-xl border border-line bg-surface p-4 hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{s.label}</dt>
                  <dd className="mt-2 font-display text-2xl font-semibold text-ink group-hover:text-plum-800">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </section>
        </>
      )}

      {/* Empty state when no data */}
      {d && d.total_organizations === 0 && (
        <section className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">No partnerships yet</h2>
          <p className="mt-2 text-ink-soft">
            Add your first institutional organization to get started.
          </p>
          <Link
            href="/admin/partnerships/organizations"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800"
          >
            Organizations directory
          </Link>
        </section>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Financial figures</p>
        <p className="mt-1 text-sm text-amber-800">
          All figures are derived from database records and reflect manually recorded
          data. They do not constitute audited financial accounts. Treat expected
          profitability as a working estimate, not realized revenue. Evidence access
          and contributor-derived research data are managed separately under Institutional
          Insights and are not accessible via commercial permissions.
        </p>
      </div>
    </div>
  );
}

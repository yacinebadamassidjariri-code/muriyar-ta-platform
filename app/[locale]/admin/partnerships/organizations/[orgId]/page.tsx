import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getOrganization, listOpportunities } from "@/lib/data/admin/partnerships";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}): Promise<Metadata> {
  const { orgId } = await params;
  return { title: `Organization ${orgId.slice(0, 8)}` };
}

const STATUS_CLASSES: Record<string, string> = {
  PROSPECT: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-stone-200 text-stone-600",
  ARCHIVED: "bg-stone-100 text-stone-500",
};

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  DISCOVERY: "Discovery",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orgId: string }>;
}) {
  const { locale, orgId } = await params;
  setRequestLocale(locale);
  await requirePermission("commercial.read");

  const [orgResult, oppsResult] = await Promise.all([
    getOrganization(orgId),
    listOpportunities({ orgId }),
  ]);

  if (!orgResult.ok) notFound();
  const org = (orgResult as { ok: true; value: import("@/lib/data/admin/partnerships").OrgDetail }).value;
  const opps = oppsResult.ok ? oppsResult.value.items : [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/partnerships/organizations"
            className="text-xs font-semibold text-plum-700 hover:underline"
          >
            ← Organizations
          </Link>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">{org.name}</h1>
        </div>
        {/* Edit is handled via partnership server actions — placeholder */}
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            STATUS_CLASSES[org.partnership_status] ?? "bg-stone-100 text-stone-700"
          }`}
        >
          {org.partnership_status.replace("_", " ")}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Profile
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Type", org.org_type ?? "—"],
                ["Country", org.country ?? "—"],
                ["Geographic focus", org.geographic_focus ?? "—"],
                ["Website", org.website ? (
                  <a
                    href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-plum-700 hover:underline"
                  >
                    {org.website}
                  </a>
                ) : "—"],
                ["Areas of interest", org.areas_of_interest?.join(", ") ?? "—"],
                ["Follow-up date", org.next_followup_date
                  ? new Date(org.next_followup_date).toLocaleDateString()
                  : "—"],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Internal notes */}
          {org.internal_notes && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Internal notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{org.internal_notes}</p>
            </section>
          )}

          {/* Opportunities */}
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Pipeline opportunities
              </h2>
              <Link
                href={`/admin/partnerships/pipeline?orgId=${org.org_id}`}
                className="text-xs font-semibold text-plum-700 hover:underline"
              >
                View all
              </Link>
            </div>
            {opps.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No opportunities yet.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-line">
                  {opps.slice(0, 5).map((opp) => (
                    <tr key={opp.opportunity_id}>
                      <td className="py-2">
                        <p className="font-semibold text-ink">{opp.title}</p>
                        {opp.research_theme && (
                          <p className="text-xs text-ink-soft">{opp.research_theme}</p>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-stone-700">
                          {STAGE_LABELS[opp.stage] ?? opp.stage}
                        </span>
                      </td>
                      <td className="py-2 pl-3 text-right text-ink-soft">
                        {opp.estimated_value_usd != null ? usd(opp.estimated_value_usd) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
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
                <dd className="text-ink">{new Date(org.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Last updated</dt>
                <dd className="text-ink">{new Date(org.updated_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900">Contact information</p>
            <p className="mt-1 text-xs text-amber-800">
              Contact details (email and phone) are stored in the database but are not
              displayed here to reduce inadvertent exposure. Access them through direct
              database queries with full audit logging.
            </p>
          </div>

          <div className="space-y-2">
            <Link
              href={`/admin/partnerships/pipeline?orgId=${org.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View pipeline
            </Link>
            <Link
              href={`/admin/partnerships/proposals?orgId=${org.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View proposals
            </Link>
            <Link
              href={`/admin/partnerships/invoices?orgId=${org.org_id}`}
              className="flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-plum-50"
            >
              View invoices
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

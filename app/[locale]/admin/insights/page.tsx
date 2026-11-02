import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getInsightsDashboardStats } from "@/lib/data/admin/insights";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Synthèses institutionnelles" : "Institutional Insights" };
}

export default async function InsightsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("insight.brief.read");

  const statsResult = await getInsightsDashboardStats();
  const stats = statsResult.ok
    ? statsResult.value
    : { total: 0, draft: 0, in_review: 0, approved: 0, published: 0, archived: 0 };

  const statCards = [
    { label: "Total briefs", value: stats.total, href: "/admin/insights/briefs" },
    { label: "Draft", value: stats.draft, href: "/admin/insights/briefs?status=DRAFT" },
    { label: "In review", value: stats.in_review, href: "/admin/insights/briefs?status=IN_REVIEW" },
    { label: "Approved", value: stats.approved, href: "/admin/insights/briefs?status=APPROVED" },
    { label: "Published", value: stats.published, href: "/admin/insights/briefs?status=PUBLISHED" },
    { label: "Archived", value: stats.archived, href: "/admin/insights/briefs?status=ARCHIVED" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">
            Institutional Insights
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Manage institutional research briefs, track editorial workflows, and
            oversee evidence review decisions.
          </p>
        </div>
        <Link
          href="/admin/insights/briefs/new"
          className="inline-flex min-h-11 items-center rounded-md bg-plum-700 px-5 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          Create brief
        </Link>
      </header>

      {!statsResult.ok && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Dashboard statistics could not be loaded. Individual sections remain accessible.
        </p>
      )}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Brief statistics
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {card.label}
              </dt>
              <dd className="mt-2 font-display text-3xl font-semibold text-ink group-hover:text-plum-800">
                {card.value}
              </dd>
            </Link>
          ))}
        </dl>
      </section>

      <section aria-labelledby="quick-links-heading" className="space-y-3">
        <h2
          id="quick-links-heading"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft"
        >
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/admin/insights/briefs",
              title: "All Briefs",
              description:
                "Browse, search, and manage all institutional research briefs.",
            },
            {
              href: "/admin/insights/briefs/new",
              title: "Create Brief",
              description: "Start a new institutional research brief from scratch.",
              permission: "insight.brief.edit",
            },
            {
              href: "/admin/insights/evidence",
              title: "Evidence Review",
              description:
                "Review research evidence links, check consent status, and manage safeguarding decisions.",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-plum-200 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              <p className="font-semibold text-ink">{link.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="safeguarding-notice-heading"
        className="rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <h2
          id="safeguarding-notice-heading"
          className="text-sm font-semibold text-amber-900"
        >
          Research safeguarding notice
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          All briefs that draw on contributor-derived evidence require human
          safeguarding review and active research consent before approval or
          publication. Consent must be revalidated at publication time. Evidence
          links are accessible only to staff with the Evidence Review permission
          and are never visible in commercial or client-facing contexts.
        </p>
      </section>
    </div>
  );
}

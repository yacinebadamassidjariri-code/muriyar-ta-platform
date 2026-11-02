import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { listEvidenceLinks } from "@/lib/data/admin/insights";
import { EvidenceTable } from "@/components/admin/insights/evidence-table";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Revue des données probantes" : "Evidence Review" };
}

export default async function EvidenceReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Only insight.evidence.review — NOT commercial.* — can reach this page.
  await requirePermission("insight.evidence.review");

  const result = await listEvidenceLinks();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Evidence Review</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Review research evidence decisions, check research consent status, and
          record safeguarding decisions. This interface does not display raw submission
          content — access to submission bodies requires the Submission Raw Read permission
          and a separate authenticated workflow.
        </p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Evidence access principles</p>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>
            Research consent must be revalidated before any evidence is used in an approved
            or exported brief. Point-in-time records alone are not sufficient.
          </li>
          <li>
            Human safeguarding review is required before contributor-derived findings are
            released. The review must address re-identification risk.
          </li>
          <li>
            Consent withdrawal must be flagged immediately. Existing distributed copies
            cannot always be recalled, but further distribution must stop.
          </li>
          <li>
            This interface is not accessible via commercial permissions. Do not include
            evidence link data in client-facing outputs.
          </li>
        </ul>
      </div>

      {!result.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Evidence records could not be loaded. Try again or contact an administrator.
        </p>
      ) : result.value.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">
            No evidence links yet
          </h2>
          <p className="mt-2 text-ink-soft">
            Evidence links are created from the brief editor when adding eligible
            research-consented submissions to a brief.
          </p>
        </section>
      ) : (
        <EvidenceTable links={result.value} />
      )}
    </div>
  );
}

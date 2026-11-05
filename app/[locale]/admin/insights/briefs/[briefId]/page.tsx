import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { getBrief } from "@/lib/data/admin/insights";
import { BriefForm } from "@/components/admin/insights/brief-form";
import { BriefWorkflowPanel } from "@/components/admin/insights/brief-workflow-panel";
import { BriefStatusBadge } from "@/components/admin/insights/brief-status-badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; briefId: string }>;
}): Promise<Metadata> {
  const { briefId } = await params;
  const result = await getBrief(briefId);
  return { title: result.ok ? result.value.title : "Brief" };
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ locale: string; briefId: string }>;
}) {
  const { locale, briefId } = await params;
  setRequestLocale(locale);
  await requirePermission("insight.brief.read");

  const result = await getBrief(briefId);
  if (!result.ok) notFound();
  const brief = (result as { ok: true; value: import("@/lib/data/admin/insights").BriefDetail }).value;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-4xl font-semibold text-ink">
              {brief.title}
            </h1>
            <BriefStatusBadge status={brief.status} />
            {brief.is_sample && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                Sample brief
              </span>
            )}
          </div>
          {brief.subtitle && (
            <p className="mt-1 text-lg text-ink-soft">{brief.subtitle}</p>
          )}
          {brief.org_name && (
            <p className="mt-1 text-sm text-ink-soft">
              Partner: {brief.org_name}
            </p>
          )}
        </div>
      </header>

      {brief.safeguarding_review_required && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">
            ⛔ Safeguarding review required — this brief cannot be distributed
          </p>
          <p className="mt-1 text-sm text-red-800">
            A contributor has withdrawn their research consent after this brief
            was approved or published. This brief is now under mandatory
            safeguarding review and{" "}
            <strong>cannot be transitioned, exported, or distributed</strong>{" "}
            until an authorized reviewer completes the safeguarding review and
            clears this flag with documented review notes.
          </p>
          {brief.safeguarding_review_reason && (
            <p className="mt-2 text-sm text-red-700">
              <strong>Reason recorded:</strong>{" "}
              {brief.safeguarding_review_reason}
            </p>
          )}
          {brief.safeguarding_review_required_since && (
            <p className="mt-1 text-xs text-red-600">
              Flag set:{" "}
              {new Date(brief.safeguarding_review_required_since).toLocaleString()}
            </p>
          )}
          <p className="mt-3 text-xs text-red-600 font-medium">
            To clear this flag: call{" "}
            <code className="rounded bg-red-100 px-1 font-mono text-red-800">
              clear_safeguarding_review_flag()
            </code>{" "}
            via the DB console or the evidence management RPC, providing
            documented review notes. This action requires AAL2 authentication
            and the <code className="rounded bg-red-100 px-1 font-mono text-red-800">insight.brief.publish</code> permission.
          </p>
        </div>
      )}

      {brief.is_sample && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Illustrative sample brief
          </p>
          <p className="mt-1 text-sm text-amber-800">
            This is an illustrative example created to demonstrate the format and
            methodology of Muriyar Ta institutional briefs. It was not
            commissioned by an institutional client and should not be treated as
            research derived from Muriyar Ta submissions. The sample label must be
            preserved in any exported or published version.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <BriefForm mode="edit" brief={brief} />
        <BriefWorkflowPanel brief={brief} />
      </div>
    </div>
  );
}

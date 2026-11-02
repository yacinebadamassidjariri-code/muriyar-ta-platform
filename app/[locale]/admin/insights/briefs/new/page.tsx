import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { BriefForm } from "@/components/admin/insights/brief-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Créer une synthèse" : "Create Brief" };
}

export default async function NewBriefPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("insight.brief.edit");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Create Brief</h1>
        <p className="mt-2 text-ink-soft">
          Create a new institutional research brief. Save drafts at any time — briefs
          must pass through editorial review before publication.
        </p>
      </header>
      <BriefForm mode="create" />
    </div>
  );
}

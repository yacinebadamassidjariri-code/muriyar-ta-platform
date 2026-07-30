import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getProfile } from "@/lib/auth/session";
import { getResourceAdminLookups } from "@/lib/data/admin/resources";
import { getResourceAdminCopy } from "@/components/admin/resources/content";
import { ResourceEditorForm } from "@/components/admin/resources/resource-editor-form";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; return { title: getResourceAdminCopy(locale).editorNewTitle }; }
export default async function NewResourcePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); await requirePermission("resource.edit");
  const [lookups, profile] = await Promise.all([getResourceAdminLookups(), getProfile()]); const copy = getResourceAdminCopy(locale);
  if (!lookups.ok) return <p role="alert" className="text-danger">{copy.actionError}</p>;
  return <div className="space-y-6"><header><Link href="/admin/resources" className="text-sm font-semibold text-brand-700 hover:underline">← {copy.back}</Link><h1 className="mt-3 font-display text-4xl font-semibold text-ink">{copy.editorNewTitle}</h1></header><ResourceEditorForm resource={null} lookups={lookups.value} copy={copy} canPublish={profile?.permissions.includes("resource.verify") ?? false} /></div>;
}

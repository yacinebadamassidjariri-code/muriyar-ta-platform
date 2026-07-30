import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getProfile } from "@/lib/auth/session";
import { getAdminResource, getResourceAdminLookups } from "@/lib/data/admin/resources";
import { getResourceAdminCopy } from "@/components/admin/resources/content";
import { ResourceEditorForm } from "@/components/admin/resources/resource-editor-form";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string; resourceId: string }> }): Promise<Metadata> { const { locale } = await params; return { title: getResourceAdminCopy(locale).editorEditTitle }; }
export default async function EditResourcePage({ params }: { params: Promise<{ locale: string; resourceId: string }> }) {
  const { locale, resourceId } = await params; setRequestLocale(locale); await requirePermission("resource.edit");
  const [resource, lookups, profile] = await Promise.all([getAdminResource(resourceId), getResourceAdminLookups(), getProfile()]); const copy = getResourceAdminCopy(locale);
  if (!resource.ok || !lookups.ok) return <p role="alert" className="text-danger">{copy.actionError}</p>; if (!resource.value) notFound();
  return <div className="space-y-6"><header><Link href="/admin/resources" className="text-sm font-semibold text-brand-700 hover:underline">← {copy.back}</Link><h1 className="mt-3 font-display text-4xl font-semibold text-ink">{copy.editorEditTitle}</h1><p className="mt-2 text-ink-soft">{resource.value.name}</p></header><ResourceEditorForm resource={resource.value} lookups={lookups.value} copy={copy} canPublish={profile?.permissions.includes("resource.verify") ?? false} /></div>;
}

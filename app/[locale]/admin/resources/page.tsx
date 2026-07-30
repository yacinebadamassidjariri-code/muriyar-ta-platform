import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getResourceAdminCopy } from "@/components/admin/resources/content";
import { ResourceFilters } from "@/components/admin/resources/resource-filters";
import { ResourceTable } from "@/components/admin/resources/resource-table";
import { EditorialPagination } from "@/components/admin/editorial/editorial-pagination";
import { getResourceAdminLookups, listAdminResources, type ResourceAdminSort, type ResourceAdminStatus } from "@/lib/data/admin/resources";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const statuses = new Set<ResourceAdminStatus>(["draft", "published", "archived"]);
const sorts = new Set<ResourceAdminSort>(["updated_desc", "updated_asc", "name_asc", "name_desc", "priority", "status"]);
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const integer = (value: string | undefined) => { const n = Number.parseInt(value ?? "", 10); return Number.isFinite(n) && n > 0 ? n : null; };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; return { title: getResourceAdminCopy(locale).title };
}

export default async function AdminResourcesPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params; setRequestLocale(locale); await requirePermission("resource.edit");
  const copy = getResourceAdminCopy(locale); const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? ""; const rawStatus = one(sp.status) ?? "";
  const status = statuses.has(rawStatus as ResourceAdminStatus) ? rawStatus as ResourceAdminStatus : null;
  const rawSort = one(sp.sort) ?? "updated_desc"; const sort = sorts.has(rawSort as ResourceAdminSort) ? rawSort as ResourceAdminSort : "updated_desc";
  const categoryId = integer(one(sp.category)); const regionId = integer(one(sp.region)); const language = one(sp.language) ?? "";
  const crisisValue = one(sp.crisis) ?? ""; const crisis = crisisValue === "true" ? true : crisisValue === "false" ? false : null;
  const rawPriority = one(sp.priority) ?? ""; const priority = (["high", "medium", "low"] as const).find((value) => value === rawPriority) ?? null;
  const page = Math.max(1, integer(one(sp.page)) ?? 1);
  const [list, lookups] = await Promise.all([listAdminResources({ q, status, categoryId, regionId, languageCode: language || null, crisis, priority, sort, page }), getResourceAdminLookups()]);
  if (!list.ok || !lookups.ok) return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">{copy.actionError}</p>;
  const base = "/admin/resources"; const actionPath = `/${locale}/admin/resources`; const current = { q, status: status ?? "", category: categoryId?.toString() ?? "", language, region: regionId?.toString() ?? "", crisis: crisisValue, priority: priority ?? "", sort };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-4xl font-semibold text-ink">{copy.title}</h1><p className="mt-2 max-w-2xl text-ink-soft">{copy.subtitle}</p></div><Link href="/admin/resources/new" className={buttonVariants({ variant: "primary", size: "lg" })}>{copy.newResource}</Link></header>
    <ResourceFilters actionPath={actionPath} clearPath={base} lookups={lookups.value} copy={copy} current={{ q, status: status ?? "", category: current.category, language, region: current.region, crisis: crisisValue, priority: priority ?? "", sort }} />
    {list.value.items.length ? <ResourceTable items={list.value.items} lookups={lookups.value} locale={locale} copy={copy} /> : <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center"><h2 className="font-display text-2xl font-semibold text-ink">{copy.emptyTitle}</h2><p className="mt-2 text-ink-soft">{copy.emptyBody}</p></section>}
    <EditorialPagination basePath={base} current={current} page={list.value.page} pageCount={list.value.pageCount} total={list.value.total} summary={copy.pageSummary} previous={copy.previous} next={copy.next} />
  </div>;
}

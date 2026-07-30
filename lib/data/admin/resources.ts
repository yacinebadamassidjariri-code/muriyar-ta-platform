import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/guards";

export type ResourceAdminStatus = "draft" | "published" | "archived";
export type ResourceAdminSort =
  | "updated_desc"
  | "updated_asc"
  | "name_asc"
  | "name_desc"
  | "priority"
  | "status";

export type ResourceAdminListRow = {
  resourceId: string;
  name: string;
  websiteUrl: string | null;
  categoryIds: number[];
  regionIds: number[];
  languageCodes: string[];
  editorialPriority: "high" | "medium" | "low" | null;
  status: ResourceAdminStatus;
  isCrisisResource: boolean;
  isFeatured: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

export type ResourceAdminDetail = ResourceAdminListRow & {
  description: string;
  phone: string;
  email: string;
  address: string;
  socialLinks: Record<string, string>;
  sortOrder: number;
  internalNotes: string;
  publishedAt: string | null;
  unpublishedAt: string | null;
};

export type ResourceCategoryOption = { categoryId: number; name: string; sortOrder: number };
export type ResourceRegionOption = { regionId: number; name: string; level: string; parentRegionId: number | null };
export type ResourceLanguageOption = { code: string; name: string };
export type ResourceAdminLookups = {
  categories: ResourceCategoryOption[];
  regions: ResourceRegionOption[];
  languages: ResourceLanguageOption[];
};
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type ListOptions = {
  q?: string | null;
  status?: ResourceAdminStatus | null;
  categoryId?: number | null;
  languageCode?: string | null;
  regionId?: number | null;
  crisis?: boolean | null;
  priority?: "high" | "medium" | "low" | null;
  sort?: ResourceAdminSort;
  page?: number;
  pageSize?: number;
};

const LIST_COLUMNS =
  "resource_id,name,website_url,languages_supported,editorial_priority,status," +
  "is_crisis_resource,is_featured,updated_at,updated_by," +
  "updated_by_user:users!resources_updated_by_fkey(display_name)";

function statusFromDb(status: string): ResourceAdminStatus {
  return status === "active" ? "published" : status as ResourceAdminStatus;
}

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function matchingResourceIds(
  categoryId?: number | null,
  regionId?: number | null,
): Promise<Result<string[] | null>> {
  if (!categoryId && !regionId) return { ok: true, value: null };
  const supabase = await createClient();
  let categoryIds: string[] | null = null;
  let regionIds: string[] | null = null;
  if (categoryId) {
    const { data, error } = await supabase.from("resource_category_assignments")
      .select("resource_id").eq("category_id", categoryId);
    if (error) return { ok: false, error: "request_failed" };
    categoryIds = (data ?? []).map((row) => row.resource_id as string);
  }
  if (regionId) {
    const { data, error } = await supabase.from("resource_geographic_assignments")
      .select("resource_id").eq("region_id", regionId);
    if (error) return { ok: false, error: "request_failed" };
    regionIds = (data ?? []).map((row) => row.resource_id as string);
  }
  const values = categoryIds && regionIds
    ? categoryIds.filter((id) => regionIds!.includes(id))
    : categoryIds ?? regionIds ?? [];
  return { ok: true, value: values };
}

async function assignmentMaps(resourceIds: string[]) {
  const categories = new Map<string, number[]>();
  const regions = new Map<string, number[]>();
  if (!resourceIds.length) return { categories, regions };
  const supabase = await createClient();
  const [categoryResult, regionResult] = await Promise.all([
    supabase.from("resource_category_assignments").select("resource_id,category_id").in("resource_id", resourceIds),
    supabase.from("resource_geographic_assignments").select("resource_id,region_id").in("resource_id", resourceIds),
  ]);
  for (const row of categoryResult.data ?? []) {
    const values = categories.get(row.resource_id as string) ?? [];
    values.push(row.category_id as number);
    categories.set(row.resource_id as string, values);
  }
  for (const row of regionResult.data ?? []) {
    const values = regions.get(row.resource_id as string) ?? [];
    values.push(row.region_id as number);
    regions.set(row.resource_id as string, values);
  }
  return { categories, regions };
}

function embeddedName(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" && "display_name" in row
    ? String((row as { display_name?: string | null }).display_name ?? "") || null
    : null;
}

export async function listAdminResources(opts: ListOptions = {}): Promise<Result<{
  items: ResourceAdminListRow[]; total: number; page: number; pageCount: number;
}>> {
  if (!(await hasPermission("resource.edit"))) return { ok: false, error: "forbidden" };
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize ?? 25)));
  const ids = await matchingResourceIds(opts.categoryId, opts.regionId);
  if (!ids.ok) return ids;
  if (ids.value?.length === 0) return { ok: true, value: { items: [], total: 0, page, pageCount: 1 } };

  const supabase = await createClient();
  let query = supabase.from("resources").select(LIST_COLUMNS, { count: "exact" });
  if (ids.value) query = query.in("resource_id", ids.value);
  if (opts.status) query = query.eq("status", opts.status === "published" ? "active" : opts.status);
  if (opts.languageCode) query = query.contains("languages_supported", [opts.languageCode]);
  if (opts.crisis !== null && opts.crisis !== undefined) query = query.eq("is_crisis_resource", opts.crisis);
  if (opts.priority) query = query.eq("editorial_priority", opts.priority);
  if (opts.q?.trim()) {
    const q = escapeIlike(opts.q.trim());
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,website_url.ilike.%${q}%`);
  }
  switch (opts.sort ?? "updated_desc") {
    case "updated_asc": query = query.order("updated_at", { ascending: true }); break;
    case "name_asc": query = query.order("name", { ascending: true }); break;
    case "name_desc": query = query.order("name", { ascending: false }); break;
    case "priority": query = query.order("editorial_priority", { ascending: true, nullsFirst: false }).order("name"); break;
    case "status": query = query.order("status").order("name"); break;
    default: query = query.order("updated_at", { ascending: false });
  }
  query = query.order("resource_id", { ascending: true });
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return { ok: false, error: "request_failed" };
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const assignments = await assignmentMaps(rows.map((row) => String(row.resource_id)));
  const items = rows.map((row): ResourceAdminListRow => ({
    resourceId: String(row.resource_id), name: String(row.name),
    websiteUrl: row.website_url ? String(row.website_url) : null,
    categoryIds: assignments.categories.get(String(row.resource_id)) ?? [],
    regionIds: assignments.regions.get(String(row.resource_id)) ?? [],
    languageCodes: Array.isArray(row.languages_supported) ? row.languages_supported.map(String) : [],
    editorialPriority: row.editorial_priority as ResourceAdminListRow["editorialPriority"],
    status: statusFromDb(String(row.status)), isCrisisResource: Boolean(row.is_crisis_resource),
    isFeatured: Boolean(row.is_featured), updatedAt: String(row.updated_at),
    updatedBy: embeddedName(row.updated_by_user),
  }));
  const total = count ?? items.length;
  return { ok: true, value: { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function getAdminResource(resourceId: string): Promise<Result<ResourceAdminDetail | null>> {
  if (!(await hasPermission("resource.edit"))) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("resources").select(
    `${LIST_COLUMNS},description,contact_phone,contact_email,address,social_links,sort_order,internal_notes,published_at,unpublished_at`,
  ).eq("resource_id", resourceId).maybeSingle();
  if (error) return { ok: false, error: "request_failed" };
  if (!data) return { ok: true, value: null };
  const assignments = await assignmentMaps([resourceId]);
  const row = data as unknown as Record<string, unknown>;
  return { ok: true, value: {
    resourceId, name: String(row.name), websiteUrl: row.website_url ? String(row.website_url) : null,
    description: String(row.description ?? ""), phone: String(row.contact_phone ?? ""),
    email: String(row.contact_email ?? ""), address: String(row.address ?? ""),
    socialLinks: row.social_links && typeof row.social_links === "object" ? row.social_links as Record<string, string> : {},
    categoryIds: assignments.categories.get(resourceId) ?? [], regionIds: assignments.regions.get(resourceId) ?? [],
    languageCodes: Array.isArray(row.languages_supported) ? row.languages_supported.map(String) : [],
    editorialPriority: row.editorial_priority as ResourceAdminDetail["editorialPriority"],
    status: statusFromDb(String(row.status)), isCrisisResource: Boolean(row.is_crisis_resource),
    isFeatured: Boolean(row.is_featured), sortOrder: Number(row.sort_order ?? 0),
    internalNotes: String(row.internal_notes ?? ""), publishedAt: row.published_at ? String(row.published_at) : null,
    unpublishedAt: row.unpublished_at ? String(row.unpublished_at) : null,
    updatedAt: String(row.updated_at), updatedBy: embeddedName(row.updated_by_user),
  } };
}

export async function getResourceAdminLookups(): Promise<Result<ResourceAdminLookups>> {
  if (!(await hasPermission("resource.edit"))) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const [categories, regions, languages] = await Promise.all([
    supabase.from("resource_categories").select("category_id,name,sort_order").order("sort_order").order("name"),
    supabase.from("geographic_regions").select("region_id,name,level,parent_region_id").order("level").order("name"),
    supabase.from("supported_languages").select("language_code,name").eq("is_active", true).order("name"),
  ]);
  if (categories.error || regions.error || languages.error) return { ok: false, error: "request_failed" };
  return { ok: true, value: {
    categories: (categories.data ?? []).map((row) => ({ categoryId: row.category_id, name: row.name, sortOrder: row.sort_order })),
    regions: (regions.data ?? []).map((row) => ({ regionId: row.region_id, name: row.name, level: row.level, parentRegionId: row.parent_region_id })),
    languages: (languages.data ?? []).map((row) => ({ code: row.language_code, name: row.name })),
  } };
}

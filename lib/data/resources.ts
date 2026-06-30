import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The ONLY read path for resources. Reads exclusively from the public views:
 *   • resources_public          — status='active', internal columns omitted
 *   • crisis_resources_public   — additionally is_crisis_resource=true
 *
 * The shape matches the views, not the base table. Optional fields stay
 * optional in TypeScript so the UI can hide rather than substitute.
 *
 * Categories are read from resource_categories so future categories added by
 * an admin appear without any code change here or in the UI.
 */

export type Resource = {
  resource_id: string;
  name: string;
  description: string | null;
  category_id: number | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  languages_supported: string[] | null;
  geographic_region_id: number | null;
  is_crisis_resource: boolean;
  last_verified_date: string | null;
};

export type Category = {
  category_id: number;
  name: string;
  sort_order: number;
  slug: string;
};

export type Region = {
  region_id: number;
  name: string;
};

export type ResourceListOptions = {
  categoryId?: number | null;
  q?: string | null;
  limit?: number;
};

/** Lowercase, hyphenated slug derived from a category name. */
export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

const RESOURCE_COLS =
  "resource_id, name, description, category_id, website_url, contact_phone, " +
  "contact_email, languages_supported, geographic_region_id, is_crisis_resource, " +
  "last_verified_date";

/** All active categories. UI consumes this directly — DB is the source of truth. */
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource_categories")
    .select("category_id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return (data as { category_id: number; name: string; sort_order: number }[])
    .map((r) => ({ ...r, slug: categorySlug(r.name) }));
}

/** Active, non-crisis-or-crisis resources from the public view. */
export async function listResources(
  opts: ResourceListOptions = {},
): Promise<Resource[]> {
  const supabase = await createClient();
  let query = supabase
    .from("resources_public")
    .select(RESOURCE_COLS)
    .order("name", { ascending: true })
    .limit(opts.limit ?? 100);

  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Resource[];
}

/** Crisis-only — the always-available safety surface. */
export async function listCrisisResources(
  opts: Pick<ResourceListOptions, "q" | "limit"> = {},
): Promise<Resource[]> {
  const supabase = await createClient();
  let query = supabase
    .from("crisis_resources_public")
    .select(
      "resource_id, name, description, website_url, contact_phone, " +
        "contact_email, languages_supported, geographic_region_id",
    )
    .order("name", { ascending: true })
    .limit(opts.limit ?? 100);

  if (opts.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  // Normalize to the Resource shape; missing fields default to safe values.
  return (data as Omit<Resource, "category_id" | "is_crisis_resource" | "last_verified_date">[])
    .map((r) => ({
      ...r,
      category_id: null,
      is_crisis_resource: true,
      last_verified_date: null,
    }));
}

/** Map of region_id → name for whatever regions appear in the current list. */
export async function getRegionLabels(
  regionIds: number[],
): Promise<Map<number, string>> {
  const ids = Array.from(new Set(regionIds.filter((n): n is number => Number.isFinite(n))));
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("geographic_regions")
    .select("region_id, name")
    .in("region_id", ids);
  if (error || !data) return new Map();
  return new Map(
    (data as { region_id: number; name: string }[]).map((r) => [r.region_id, r.name]),
  );
}

/** Map of category_id → name for the current list (DB names verbatim). */
export async function getCategoryLabels(
  categoryIds: number[],
): Promise<Map<number, string>> {
  const ids = Array.from(new Set(categoryIds.filter((n): n is number => Number.isFinite(n))));
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource_categories")
    .select("category_id, name")
    .in("category_id", ids);
  if (error || !data) return new Map();
  return new Map(
    (data as { category_id: number; name: string }[]).map((r) => [r.category_id, r.name]),
  );
}
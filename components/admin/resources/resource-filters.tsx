"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { EditorialFilterPanel } from "@/components/admin/editorial/editorial-filter-panel";
import type { ResourceAdminLookups, ResourceAdminSort, ResourceAdminStatus } from "@/lib/data/admin/resources";
import type { ResourceAdminCopy } from "./content";

export function ResourceFilters({
  actionPath, clearPath, lookups, copy, current,
}: {
  actionPath: string;
  clearPath: string;
  lookups: ResourceAdminLookups;
  copy: ResourceAdminCopy;
  current: {
    q: string; status: ResourceAdminStatus | ""; category: string; language: string;
    region: string; crisis: string; priority: string; sort: ResourceAdminSort;
  };
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement || target instanceof HTMLElement && target.isContentEditable) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);
  const selectClass = "mt-1.5 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
  return (
    <form action={actionPath} method="get" role="search" aria-label={copy.filters}
      className="rounded-xl border border-line bg-surface p-4">
      <EditorialFilterPanel actions={<><Button asChild variant="ghost"><Link href={clearPath}>{copy.clear}</Link></Button><Button type="submit" variant="secondary">{copy.apply}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <Label htmlFor="resource-q">{copy.search}</Label>
          <div className="relative mt-1.5">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input ref={searchRef} id="resource-q" name="q" type="search" defaultValue={current.q} placeholder={copy.searchPlaceholder} className="pl-9" aria-keyshortcuts="/" title={copy.searchShortcut} />
          </div>
        </div>
        <div><Label htmlFor="resource-status">{copy.status}</Label><select id="resource-status" name="status" defaultValue={current.status} className={selectClass}>
          <option value="">{copy.any}</option><option value="draft">{copy.draft}</option><option value="published">{copy.published}</option><option value="archived">{copy.archived}</option>
        </select></div>
        <div><Label htmlFor="resource-category">{copy.category}</Label><select id="resource-category" name="category" defaultValue={current.category} className={selectClass}>
          <option value="">{copy.any}</option>{lookups.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
        </select></div>
        <div><Label htmlFor="resource-language">{copy.language}</Label><select id="resource-language" name="language" defaultValue={current.language} className={selectClass}>
          <option value="">{copy.any}</option>{lookups.languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select></div>
        <div><Label htmlFor="resource-region">{copy.geography}</Label><select id="resource-region" name="region" defaultValue={current.region} className={selectClass}>
          <option value="">{copy.any}</option>{lookups.regions.map((r) => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}
        </select></div>
        <div><Label htmlFor="resource-crisis">{copy.crisis}</Label><select id="resource-crisis" name="crisis" defaultValue={current.crisis} className={selectClass}>
          <option value="">{copy.any}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option>
        </select></div>
        <div><Label htmlFor="resource-priority">{copy.priority}</Label><select id="resource-priority" name="priority" defaultValue={current.priority} className={selectClass}>
          <option value="">{copy.any}</option><option value="high">{copy.high}</option><option value="medium">{copy.medium}</option><option value="low">{copy.low}</option>
        </select></div>
        <div><Label htmlFor="resource-sort">{copy.sort}</Label><select id="resource-sort" name="sort" defaultValue={current.sort} className={selectClass}>
          <option value="updated_desc">{copy.updatedNewest}</option><option value="updated_asc">{copy.updatedOldest}</option>
          <option value="name_asc">{copy.nameAsc}</option><option value="name_desc">{copy.nameDesc}</option>
          <option value="priority">{copy.prioritySort}</option><option value="status">{copy.statusSort}</option>
        </select></div>
      </div>
      </EditorialFilterPanel>
    </form>
  );
}

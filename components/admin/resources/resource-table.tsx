"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, Star } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { bulkResourceAction } from "@/lib/actions/admin/resources";
import { Link } from "@/lib/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorialBulkToolbar } from "@/components/admin/editorial/editorial-bulk-toolbar";
import { EditorialStatusBadge } from "@/components/admin/editorial/editorial-status-badge";
import type { ResourceAdminListRow, ResourceAdminLookups } from "@/lib/data/admin/resources";
import type { ResourceAdminCopy } from "./content";

type BulkAction = "publish" | "unpublish" | "archive" | "restore" | "assign_category" | "remove_category" | "change_priority";
type OptimisticBulkUpdate = {
  resourceIds: string[];
  action: BulkAction;
  categoryId: number | null;
  priority: "high" | "medium" | "low" | null;
};

function formatDate(value: string, locale: string) {
  try { return new Intl.DateTimeFormat(locale === "zar" ? "en" : locale, { dateStyle: "medium" }).format(new Date(value)); }
  catch { return value.slice(0, 10); }
}

function updateRowsOptimistically(
  rows: ResourceAdminListRow[],
  update: OptimisticBulkUpdate,
): ResourceAdminListRow[] {
  const selected = new Set(update.resourceIds);
  return rows.map((row) => {
    if (!selected.has(row.resourceId)) return row;
    if (update.action === "publish") return { ...row, status: "published" };
    if (update.action === "unpublish") {
      return row.status === "archived" ? row : { ...row, status: "draft" };
    }
    if (update.action === "archive") return { ...row, status: "archived" };
    if (update.action === "restore") {
      return row.status === "published" ? row : { ...row, status: "draft" };
    }
    if (update.action === "change_priority") {
      return { ...row, editorialPriority: update.priority };
    }
    if (update.categoryId === null) return row;
    if (update.action === "assign_category" && !row.categoryIds.includes(update.categoryId)) {
      return { ...row, categoryIds: [...row.categoryIds, update.categoryId] };
    }
    if (update.action === "remove_category" && row.categoryIds.length > 1) {
      return { ...row, categoryIds: row.categoryIds.filter((id) => id !== update.categoryId) };
    }
    return row;
  });
}

function countMessage(template: string, count: number) {
  const [singular, plural = singular] = template.split("|");
  return (count === 1 ? singular : plural).replace("{count}", String(count));
}

function bulkMessage(copy: ResourceAdminCopy, action: BulkAction, summary: {
  updated: number; skipped: number; already: number;
}) {
  const alreadyTemplate = action === "publish" ? copy.alreadyPublished
    : action === "unpublish" ? copy.alreadyUnpublished
      : action === "archive" ? copy.alreadyArchived
        : action === "restore" ? copy.alreadyRestored
          : action === "assign_category" ? copy.alreadyAssigned
            : action === "remove_category" ? copy.alreadyRemoved
              : copy.priorityUnchanged;
  return [
    countMessage(copy.bulkUpdated, summary.updated),
    countMessage(copy.bulkSkipped, summary.skipped),
    countMessage(alreadyTemplate, summary.already),
  ].join(" · ");
}

export function ResourceTable({ items, lookups, locale, copy }: {
  items: ResourceAdminListRow[]; lookups: ResourceAdminLookups; locale: string; copy: ResourceAdminCopy;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<BulkAction>("publish");
  const [categoryId, setCategoryId] = useState<number | null>(lookups.categories[0]?.categoryId ?? null);
  const [priority, setPriority] = useState<"high" | "medium" | "low" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimisticItems, applyOptimisticUpdate] = useOptimistic(items, updateRowsOptimistically);
  const router = useRouter();
  const allSelected = items.length > 0 && selected.length === items.length;
  const categoryNames = useMemo(() => new Map(lookups.categories.map((c) => [c.categoryId, c.name])), [lookups.categories]);
  const regionNames = useMemo(() => new Map(lookups.regions.map((r) => [r.regionId, r.name])), [lookups.regions]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function runBulk() {
    setMessage(null);
    const resourceIds = [...selected];
    startTransition(async () => {
      applyOptimisticUpdate({ resourceIds, action, categoryId, priority });
      const result = await bulkResourceAction({ resourceIds, action, categoryId, priority });
      if (result.ok) {
        setSelected([]);
        setMessage({ ok: true, text: bulkMessage(copy, action, result.bulk) });
        router.refresh();
      } else setMessage({ ok: false, text: `${copy.actionError} (${result.requestId})` });
    });
  }

  return <div className="space-y-3">
    <EditorialBulkToolbar
      label={copy.bulkAction}
      selected={`${selected.length} ${copy.selected}`}
      notice={message?.text}
      noticeIsError={message ? !message.ok : false}
    >
      <label className="text-sm text-ink"><span className="sr-only">{copy.bulkAction}</span>
        <select value={action} onChange={(e) => setAction(e.target.value as BulkAction)} className="h-10 rounded-md border border-line bg-surface px-3">
          <option value="publish">{copy.publish}</option><option value="unpublish">{copy.unpublish}</option>
          <option value="archive">{copy.archive}</option><option value="restore">{copy.restore}</option>
          <option value="assign_category">{copy.assignCategory}</option><option value="remove_category">{copy.removeCategory}</option>
          <option value="change_priority">{copy.changePriority}</option>
        </select>
      </label>
      {(action === "assign_category" || action === "remove_category") ? <label className="text-sm text-ink"><span className="sr-only">{copy.category}</span>
        <select value={categoryId ?? ""} onChange={(e) => setCategoryId(Number(e.target.value))} className="h-10 max-w-64 rounded-md border border-line bg-surface px-3">
          {lookups.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
        </select>
      </label> : null}
      {action === "change_priority" ? <label className="text-sm text-ink"><span className="sr-only">{copy.priority}</span>
        <select value={priority ?? ""} onChange={(e) => setPriority((e.target.value || null) as typeof priority)} className="h-10 rounded-md border border-line bg-surface px-3">
          <option value="">{copy.none}</option><option value="high">{copy.high}</option><option value="medium">{copy.medium}</option><option value="low">{copy.low}</option>
        </select>
      </label> : null}
      <Button type="button" onClick={runBulk} disabled={pending || selected.length === 0}>{copy.runAction}</Button>
    </EditorialBulkToolbar>

    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full text-sm">
        <thead className="border-b border-line bg-surface-muted text-left text-ink-soft"><tr>
          <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} aria-label={copy.selectAll}
            onChange={() => setSelected(allSelected ? [] : items.map((item) => item.resourceId))} className="h-4 w-4 accent-brand-600" /></th>
          <th className="px-4 py-3 font-medium">{copy.organization}</th><th className="hidden px-4 py-3 font-medium lg:table-cell">{copy.categories}</th>
          <th className="hidden px-4 py-3 font-medium md:table-cell">{copy.coverage}</th><th className="px-4 py-3 font-medium">{copy.status}</th>
          <th className="hidden px-4 py-3 font-medium xl:table-cell">{copy.priority}</th><th className="hidden px-4 py-3 font-medium xl:table-cell">{copy.updated}</th>
          <th className="px-4 py-3"><span className="sr-only">{copy.edit}</span></th>
        </tr></thead>
        <tbody className="divide-y divide-line">{optimisticItems.map((item) => <tr key={item.resourceId} className="align-top">
          <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(item.resourceId)} aria-label={`${copy.selectOne}: ${item.name}`} onChange={() => toggle(item.resourceId)} className="h-4 w-4 accent-brand-600" /></td>
          <td className="max-w-xs px-4 py-4"><Link href={`/admin/resources/${item.resourceId}`} className="font-semibold text-ink hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">{item.name}</Link>
            <div className="mt-1 flex flex-wrap gap-1">{item.isCrisisResource ? <Badge className="border-danger/20 bg-danger/5 px-2 py-0.5 text-xs text-danger"><AlertTriangle className="mr-1 h-3 w-3" />{copy.crisisShort}</Badge> : null}{item.isFeatured ? <Badge className="px-2 py-0.5 text-xs"><Star className="mr-1 h-3 w-3" />{copy.featured}</Badge> : null}</div>
            <dl className="mt-2 space-y-1 text-xs text-ink-soft lg:hidden"><div><dt className="inline font-medium">{copy.categories}: </dt><dd className="inline">{item.categoryIds.map((id) => categoryNames.get(id)).filter(Boolean).join(", ")}</dd></div><div className="md:hidden"><dt className="inline font-medium">{copy.coverage}: </dt><dd className="inline">{item.regionIds.map((id) => regionNames.get(id)).filter(Boolean).join(", ") || "—"}</dd></div></dl>
          </td>
          <td className="hidden max-w-sm px-4 py-4 lg:table-cell"><div className="flex flex-wrap gap-1">{item.categoryIds.map((id) => <Badge key={id} className="px-2 py-0.5 text-xs">{categoryNames.get(id) ?? id}</Badge>)}</div></td>
          <td className="hidden px-4 py-4 md:table-cell">{item.regionIds.map((id) => regionNames.get(id)).filter(Boolean).join(", ") || "—"}</td>
          <td className="px-4 py-4"><EditorialStatusBadge status={item.status} label={copy[item.status]} /></td>
          <td className="hidden px-4 py-4 capitalize xl:table-cell">{item.editorialPriority ? copy[item.editorialPriority] : "—"}</td>
          <td className="hidden whitespace-nowrap px-4 py-4 xl:table-cell">{formatDate(item.updatedAt, locale)}<span className="block text-xs text-ink-soft">{item.updatedBy ?? "—"}</span></td>
          <td className="px-4 py-4 text-right"><Link href={`/admin/resources/${item.resourceId}`} className="font-semibold text-brand-700 hover:underline">{copy.edit}</Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

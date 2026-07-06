import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Language, SortKey } from "@/lib/data/admin/podcast";
import { getPodcastSeries } from "@/lib/content/podcast-series";

type Labels = {
  searchLabel: string;
  searchPlaceholder: string;
  statusLabel: string;
  languageLabel: string;
  seriesLabel: string;
  sortLabel: string;
  applyLabel: string;
  any: string;
  statusDraft: string;
  statusPublished: string;
  statusArchived: string;
  sortNewest: string;
  sortOldest: string;
  sortUpdatedDesc: string;
  sortUpdatedAsc: string;
  sortTitleAsc: string;
  sortTitleDesc: string;
  seriesLabels: Record<string, string>; // slug → translated name
};

/**
 * Server-rendered URL-driven filter bar. Submits GET to /admin/podcast,
 * so every state change is a navigation. Pressing Enter in the search
 * field also submits. Works with JavaScript disabled.
 *
 * The form intentionally does NOT include a hidden `page` input — changing
 * filters resets to page 1.
 */
export function PodcastDashboardFilters({
  basePath,
  languages,
  current,
  labels,
}: {
  basePath: string;
  languages: Language[];
  current: {
    q: string;
    status: "" | "draft" | "published" | "archived";
    language: string;
    series: string;
    sort: SortKey;
  };
  labels: Labels;
}) {
  const series = getPodcastSeries();

  const fieldClass =
    "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <form
      action={basePath}
      method="get"
      role="search"
      aria-label="Podcast filters"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
    >
      {/* Search */}
      <div className="lg:col-span-2">
        <Label htmlFor="pcast-q">{labels.searchLabel}</Label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
          <Input
            id="pcast-q"
            name="q"
            type="search"
            defaultValue={current.q}
            placeholder={labels.searchPlaceholder}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="pcast-status">{labels.statusLabel}</Label>
        <select
          id="pcast-status"
          name="status"
          defaultValue={current.status}
          className={"mt-1.5 " + fieldClass}
        >
          <option value="">{labels.any}</option>
          <option value="draft">{labels.statusDraft}</option>
          <option value="published">{labels.statusPublished}</option>
          <option value="archived">{labels.statusArchived}</option>
        </select>
      </div>

      {/* Language */}
      <div>
        <Label htmlFor="pcast-language">{labels.languageLabel}</Label>
        <select
          id="pcast-language"
          name="language"
          defaultValue={current.language}
          className={"mt-1.5 " + fieldClass}
        >
          <option value="">{labels.any}</option>
          {languages.map((l) => (
            <option key={l.language_code} value={l.language_code}>
              {l.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Series */}
      <div>
        <Label htmlFor="pcast-series">{labels.seriesLabel}</Label>
        <select
          id="pcast-series"
          name="series"
          defaultValue={current.series}
          className={"mt-1.5 " + fieldClass}
        >
          <option value="">{labels.any}</option>
          {series.map((s) => (
            <option key={s.slug} value={s.slug}>
              {labels.seriesLabels[s.slug] ?? s.slug}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <Label htmlFor="pcast-sort">{labels.sortLabel}</Label>
        <select
          id="pcast-sort"
          name="sort"
          defaultValue={current.sort}
          className={"mt-1.5 " + fieldClass}
        >
          <option value="newest">{labels.sortNewest}</option>
          <option value="oldest">{labels.sortOldest}</option>
          <option value="updated_desc">{labels.sortUpdatedDesc}</option>
          <option value="updated_asc">{labels.sortUpdatedAsc}</option>
          <option value="title_asc">{labels.sortTitleAsc}</option>
          <option value="title_desc">{labels.sortTitleDesc}</option>
        </select>
      </div>

      <div className="flex items-end sm:col-span-2 lg:col-span-6 lg:justify-end">
        <Button type="submit" variant="secondary">
          {labels.applyLabel}
        </Button>
      </div>
    </form>
  );
}
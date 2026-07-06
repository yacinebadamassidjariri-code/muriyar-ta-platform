import { ArrowUpRight, Star } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { PodcastStatusBadge } from "./podcast-status-badge";
import { localeLabels, type Locale } from "@/lib/i18n/routing";
import type { EpisodeListRow } from "@/lib/data/admin/podcast";

type Labels = {
  colTitle: string;
  colStatus: string;
  colLanguage: string;
  colSeries: string;
  colCreatedBy: string;
  colUpdated: string;
  colPublished: string;
  colFeatured: string;
  colAction: string;
  yes: string;
  no: string;
  edit: string;
  noSlug: string;
  statusDraft: string;
  statusPublished: string;
  statusArchived: string;
  seriesLabels: Record<string, string>; // slug → translated name
};

function fmtDate(ts: string | null | undefined, locale: string): string {
  if (!ts) return "—";
  const intl = locale === "zar" ? "en" : locale;
  try {
    return new Intl.DateTimeFormat(intl, {
      dateStyle: "medium",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

export function PodcastDashboardTable({
  items,
  locale,
  labels,
}: {
  items: EpisodeListRow[];
  locale: string;
  labels: Labels;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full text-sm">
        <thead className="border-b border-line bg-surface-muted text-left text-ink-soft">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">{labels.colTitle}</th>
            <th scope="col" className="px-4 py-3 font-medium">{labels.colStatus}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colLanguage}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colSeries}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colCreatedBy}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colUpdated}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colPublished}</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">{labels.colFeatured}</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">{labels.colAction}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((row) => {
            const titleHref = `/admin/podcast/${row.episode_id}`;
            const langLabel =
              localeLabels[row.language_code as Locale] ?? row.language_code;
            const seriesLabel = row.series_slug
              ? labels.seriesLabels[row.series_slug] ?? row.series_slug
              : "—";
            return (
              <tr key={row.episode_id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    href={titleHref}
                    className="font-medium text-ink hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {row.title}
                  </Link>
                  <div className="mt-0.5 truncate text-xs text-ink-soft">
                    {row.slug ?? labels.noSlug}
                  </div>
                  {/* Compact metadata strip for narrow viewports */}
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-soft lg:hidden">
                    <div>
                      <dt className="inline">{labels.colLanguage}: </dt>
                      <dd className="inline">{langLabel}</dd>
                    </div>
                    <div>
                      <dt className="inline">{labels.colSeries}: </dt>
                      <dd className="inline">{seriesLabel}</dd>
                    </div>
                    <div>
                      <dt className="inline">{labels.colUpdated}: </dt>
                      <dd className="inline">{fmtDate(row.updated_at, locale)}</dd>
                    </div>
                    <div>
                      <dt className="inline">{labels.colPublished}: </dt>
                      <dd className="inline">{fmtDate(row.published_at, locale)}</dd>
                    </div>
                  </dl>
                </td>
                <td className="px-4 py-3">
                  <PodcastStatusBadge
                    status={row.status}
                    labels={{
                      draft: labels.statusDraft,
                      published: labels.statusPublished,
                      archived: labels.statusArchived,
                    }}
                  />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">{langLabel}</td>
                <td className="hidden px-4 py-3 lg:table-cell">{seriesLabel}</td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {row.created_by_display ?? "—"}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                  {fmtDate(row.updated_at, locale)}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                  {fmtDate(row.published_at, locale)}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {row.is_featured ? (
                    <span className="inline-flex items-center gap-1 text-brand-700">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      {labels.yes}
                    </span>
                  ) : (
                    <span className="text-ink-soft">{labels.no}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={titleHref}
                    aria-label={`${labels.edit}: ${row.title}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {labels.edit}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
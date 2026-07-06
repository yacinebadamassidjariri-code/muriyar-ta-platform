import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import {
  listAllEpisodes,
  listLanguages,
  type EpisodeStatus,
  type SortKey,
} from "@/lib/data/admin/podcast";
import { getPodcastSeries } from "@/lib/content/podcast-series";
import { PodcastDashboardFilters } from "@/components/admin/podcast/podcast-dashboard-filters";
import { PodcastDashboardTable } from "@/components/admin/podcast/podcast-dashboard-table";
import { PodcastEmptyState } from "@/components/admin/podcast/empty-state";
import { NewEpisodeButton } from "@/components/admin/podcast/new-episode-button";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<EpisodeStatus>([
  "draft",
  "published",
  "archived",
]);
const VALID_SORT = new Set<SortKey>([
  "newest",
  "oldest",
  "title_asc",
  "title_desc",
  "updated_desc",
  "updated_asc",
]);

function pickString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseStatus(v: string | undefined): EpisodeStatus | null {
  return v && VALID_STATUS.has(v as EpisodeStatus)
    ? (v as EpisodeStatus)
    : null;
}

function parseSort(v: string | undefined): SortKey {
  return v && VALID_SORT.has(v as SortKey) ? (v as SortKey) : "newest";
}

function parsePage(v: string | undefined): number {
  const n = Number.parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function buildPageHref(
  basePath: string,
  current: Record<string, string | null | undefined>,
  nextPage: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v) params.set(k, v);
  }
  if (nextPage > 1) params.set("page", String(nextPage));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminPodcast" });
  return { title: t("dashTitle") };
}

export default async function PodcastDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("podcast.edit");

  const t = await getTranslations({ locale, namespace: "adminPodcast" });
  const sp = await searchParams;

  const q = pickString(sp.q)?.trim() ?? "";
  const status = parseStatus(pickString(sp.status));
  const language = pickString(sp.language) ?? "";
  const series = pickString(sp.series) ?? "";
  const sort = parseSort(pickString(sp.sort));
  const page = parsePage(pickString(sp.page));

  // Series translated names; same source the public site uses.
  const seriesLabels: Record<string, string> = {};
  for (const s of getPodcastSeries()) {
    seriesLabels[s.slug] = t(`series.${s.slug}.name`);
  }

  const [episodesResult, languagesResult] = await Promise.all([
    listAllEpisodes({
      q: q || null,
      status,
      languageCode: language || null,
      seriesSlug: series || null,
      sort,
      page,
      pageSize: 25,
    }),
    listLanguages(),
  ]);

  const basePath = `/${locale}/admin/podcast`;

  if (!episodesResult.ok) {
  console.error("Podcast error:", episodesResult.error);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("dashTitle")}</h1>
          <p className="mt-1 text-ink-soft">{t("dashSubtitle")}</p>
        </div>
        <NewEpisodeButton label={t("newEpisode")} />
      </header>

      <pre
        className="rounded-md bg-red-100 p-4 text-sm text-red-700 whitespace-pre-wrap"
      >
        {episodesResult.error}
      </pre>
    </div>
  );
}

  const { items, total, pageCount } = episodesResult.value;
  const languages = languagesResult.ok ? languagesResult.value : [];
  const hasFilters =
    q !== "" || !!status || language !== "" || series !== "";
  const isEmpty = total === 0;

  const currentForLinks = {
    q,
    status: status ?? "",
    language,
    series,
    sort,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("dashTitle")}</h1>
          <p className="mt-1 text-ink-soft">{t("dashSubtitle")}</p>
        </div>
        <NewEpisodeButton label={t("newEpisode")} />
      </header>

      <PodcastDashboardFilters
        basePath={basePath}
        languages={languages}
        current={{
          q,
          status: (status ?? "") as "" | "draft" | "published" | "archived",
          language,
          series,
          sort,
        }}
        labels={{
          searchLabel: t("searchLabel"),
          searchPlaceholder: t("searchPlaceholder"),
          statusLabel: t("statusLabel"),
          languageLabel: t("languageLabel"),
          seriesLabel: t("seriesLabel"),
          sortLabel: t("sortLabel"),
          applyLabel: t("apply"),
          any: t("any"),
          statusDraft: t("statusDraft"),
          statusPublished: t("statusPublished"),
          statusArchived: t("statusArchived"),
          sortNewest: t("sortNewest"),
          sortOldest: t("sortOldest"),
          sortUpdatedDesc: t("sortUpdatedDesc"),
          sortTitleAsc: t("sortTitleAsc"),
          sortTitleDesc: t("sortTitleDesc"),
          seriesLabels,
        }}
      />

      {isEmpty ? (
        <PodcastEmptyState
          mode={hasFilters ? "filtered" : "fresh"}
          labels={{
            freshTitle: t("emptyFreshTitle"),
            freshBody: t("emptyFreshBody"),
            filteredTitle: t("emptyFilteredTitle"),
            filteredBody: t("emptyFilteredBody"),
            newEpisode: t("newEpisode"),
          }}
        />
      ) : (
        <>
          <PodcastDashboardTable
            items={items}
            locale={locale}
            labels={{
              colTitle: t("colTitle"),
              colStatus: t("colStatus"),
              colLanguage: t("colLanguage"),
              colSeries: t("colSeries"),
              colCreatedBy: t("colCreatedBy"),
              colUpdated: t("colUpdated"),
              colPublished: t("colPublished"),
              colFeatured: t("colFeatured"),
              colAction: t("colAction"),
              yes: t("yes"),
              no: t("no"),
              edit: t("edit"),
              noSlug: t("noSlug"),
              statusDraft: t("statusDraft"),
              statusPublished: t("statusPublished"),
              statusArchived: t("statusArchived"),
              seriesLabels,
            }}
          />

          <nav
            aria-label={t("paginationLabel")}
            className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft"
          >
            <p>
              {t("paginationSummary", {
                page,
                pageCount,
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildPageHref(basePath, currentForLinks, page - 1)}
                  className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-ink hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {t("prev")}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-md border border-line bg-surface-muted px-3 py-1.5 font-medium text-ink-soft opacity-60"
                >
                  {t("prev")}
                </span>
              )}
              {page < pageCount ? (
                <Link
                  href={buildPageHref(basePath, currentForLinks, page + 1)}
                  className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-ink hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {t("next")}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-md border border-line bg-surface-muted px-3 py-1.5 font-medium text-ink-soft opacity-60"
                >
                  {t("next")}
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
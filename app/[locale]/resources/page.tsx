import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  listCategories,
  listResources,
  getRegionLabels,
  type Resource,
} from "@/lib/data/resources";
import {
  resourcesEditorial,
  RESOURCE_CLUSTERS,
  clusterKeyForSlug,
  isPublicResourceThemeCategory,
  publicResourceThemeCategoryName,
  regionRank,
  isLocalRegion,
  isRecommended,
} from "@/components/resources/content";
import {
  ResourceSection,
  type SectionEntry,
} from "@/components/resources/resource-section";
import { ResourceEntry } from "@/components/resources/resource-entry";
import { CrisisCallout } from "@/components/resources/crisis-callout";
import { SearchBar } from "@/components/resources/search-bar";
import { ResourcesEmptyState } from "@/components/resources/empty-state";
import { CategoryNav } from "@/components/resources/category-nav";

export const revalidate = 300;
const RESULTS_PER_PAGE = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resources" });
  return { title: t("listTitle"), description: t("listSubtitle") };
}

export default async function ResourcesIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "resources" });
  const ed =
    resourcesEditorial[locale as keyof typeof resourcesEditorial] ??
    resourcesEditorial.en;

  const categories = await listCategories();
  const themeCategories = categories
    .filter((category) => isPublicResourceThemeCategory(category.slug))
    .map((category) => ({
      ...category,
      name: publicResourceThemeCategoryName(category.slug, category.name),
    }));
  const requestedCategoryId = sp.category ? Number(sp.category) : null;
  const catId = themeCategories.some(
    (category) => category.category_id === requestedCategoryId,
  )
    ? requestedCategoryId
    : null;
  const q = sp.q?.trim() || null;
  const searching = !!q || catId != null;
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const queriedResources = await listResources({ categoryId: catId, q });

  const categoryIdsFor = (resource: Resource): number[] =>
    resource.category_ids.length > 0
      ? resource.category_ids
      : resource.category_id != null
        ? [resource.category_id]
        : [];

  // Keep public category results strictly scoped to the selected many-to-many
  // assignment, even if the backing view or query behavior changes later.
  const resources =
    catId == null
      ? queriedResources
      : queriedResources.filter((resource) =>
          categoryIdsFor(resource).includes(catId),
        );

  const regionLabels = await getRegionLabels(
    resources
      .map((r) => r.geographic_region_id)
      .filter((id): id is number => id !== null),
  );
  const catSlug = new Map(categories.map((c) => [c.category_id, c.slug]));
  const catName = new Map(
    categories.map((category) => [
      category.category_id,
      publicResourceThemeCategoryName(category.slug, category.name),
    ]),
  );

  const regionOf = (r: Resource): string | undefined =>
    r.geographic_region_id != null
      ? regionLabels.get(r.geographic_region_id)
      : undefined;

  const toEntry = (r: Resource): SectionEntry => {
    const region = regionOf(r);
    const categoryIds = categoryIdsFor(r);
    return {
      resourceId: r.resource_id,
      resource: r,
      regionLabel: region,
      isLocal: isLocalRegion(region),
      categoryLabels: categoryIds
        .map((id) => catName.get(id))
        .filter((name): name is string => name !== undefined),
    };
  };

  const sortLocale = locale === "fr" ? "fr" : "en";
  const byLocalFirst = (a: Resource, b: Resource): number =>
    regionRank(regionOf(a)) - regionRank(regionOf(b)) ||
    a.name.localeCompare(b.name, sortLocale, { sensitivity: "base" }) ||
    a.resource_id.localeCompare(b.resource_id);

  const entryLabels = { visit: ed.visit, localTag: ed.localTag };

  // Group resources into the editorial "need" clusters (presentation only).
  const byCluster = new Map<string, Resource[]>();
  if (!searching) {
    const seenByCluster = new Map<string, Set<string>>();
    for (const r of resources) {
      const categoryIds = categoryIdsFor(r);
      const clusterKeys = new Set(
        categoryIds.map((id) => clusterKeyForSlug(catSlug.get(id))),
      );
      if (clusterKeys.size === 0) clusterKeys.add(clusterKeyForSlug(undefined));

      for (const key of clusterKeys) {
        const seen = seenByCluster.get(key) ?? new Set<string>();
        if (seen.has(r.resource_id)) continue;
        seen.add(r.resource_id);
        seenByCluster.set(key, seen);

        const arr = byCluster.get(key) ?? [];
        arr.push(r);
        byCluster.set(key, arr);
      }
    }
  }

  const sections = RESOURCE_CLUSTERS.map((cluster) => {
    const items = (byCluster.get(cluster.key) ?? [])
      .slice()
      .sort(byLocalFirst);
    if (items.length === 0) return null;
    const recommended: SectionEntry[] = [];
    const rest: SectionEntry[] = [];
    for (const r of items) {
      (isRecommended(r.name, cluster.recommend) ? recommended : rest).push(
        toEntry(r),
      );
    }
    return { cluster, recommended, rest };
  }).filter(
    (s): s is { cluster: (typeof RESOURCE_CLUSTERS)[number]; recommended: SectionEntry[]; rest: SectionEntry[] } =>
      s !== null,
  );

  const results = searching
    ? resources.slice().sort(byLocalFirst).map(toEntry)
    : [];
  const pageCount = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleResults = results.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE,
  );

  const pageHref = (nextPage: number): string => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (catId != null) query.set("category", String(catId));
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/resources?${qs}` : "/resources";
  };

  const categoryDescriptions = Object.fromEntries(
    themeCategories.map((category) => [
      category.slug,
      ed.clusters[clusterKeyForSlug(category.slug)].intro,
    ]),
  );

  return (
    <article className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 md:py-24">
      <header className="grid gap-9 border-b border-stone-200 pb-14 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] md:items-end md:gap-16 md:pb-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-600">
            {ed.heroEyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.25rem,7vw,6rem)] font-medium leading-[0.95] tracking-[-0.025em] text-plum-900">
            {ed.heroTitle}
          </h1>
        </div>
        <div className="max-w-xl md:pb-1">
          <p className="text-lg leading-[1.7] text-charcoal-500">{ed.intro}</p>
          <p className="mt-5 border-l border-rose-300 pl-4 text-sm leading-relaxed text-charcoal-500">
            {ed.trust}
          </p>
        </div>
      </header>

      <CrisisCallout
        heading={ed.crisisHeading}
        body={ed.crisisBody}
        cta={ed.crisisCta}
      />

      <section aria-labelledby="resource-needs" className="mt-20 md:mt-24">
        <h2
          id="resource-needs"
          className="font-display text-[clamp(2.5rem,5vw,4rem)] font-medium leading-none tracking-[-0.02em] text-plum-900"
        >
          {ed.browseHeading}
        </h2>
        <div className="mt-8">
          <CategoryNav
            categories={themeCategories}
            activeCategoryId={catId}
            q={q}
            allLabel={t("allCategories")}
            ariaLabel={ed.categoryNavLabel}
            descriptions={categoryDescriptions}
          />
        </div>
      </section>

      <section
        aria-labelledby="resource-search"
        className="mt-20 border-t border-stone-200 pt-12 md:mt-24 md:pt-16"
      >
        <h2
          id="resource-search"
          className="font-display text-3xl font-medium text-plum-900 md:text-4xl"
        >
          {ed.searchHeading}
        </h2>
        <div className="mt-7 max-w-3xl">
          <SearchBar
            label={ed.searchLabel}
            placeholder={ed.searchPlaceholder}
            submitLabel={ed.searchSubmit}
            defaultValue={q ?? ""}
            activeCategoryId={catId}
            action={`/${locale}/resources`}
          />
        </div>
      </section>

      {searching ? (
        <section
          aria-labelledby="res-results"
          className="mt-16 border-t border-stone-200 pt-12"
        >
          <h2
            id="res-results"
            className="font-display text-3xl font-medium text-plum-900 md:text-4xl"
          >
            {ed.resultsHeading}
          </h2>
          {results.length === 0 ? (
            <div className="mt-6">
              <ResourcesEmptyState title={ed.emptyTitle} body={ed.emptyBody} />
            </div>
          ) : (
            <div className="mt-7 divide-y divide-stone-200 border-t border-stone-200">
              {visibleResults.map((e) => (
                <ResourceEntry
                  key={e.resourceId}
                  resource={e.resource}
                  regionLabel={e.regionLabel}
                  isLocal={e.isLocal}
                  categoryLabels={e.categoryLabels}
                  labels={entryLabels}
                />
              ))}
            </div>
          )}
          {results.length > 0 && pageCount > 1 ? (
            <nav
              aria-label={ed.paginationLabel}
              className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-charcoal-500"
            >
              <p>{ed.pageSummary(currentPage, pageCount)}</p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(currentPage - 1)}
                    className="border-b border-rose-300 pb-1 font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
                  >
                    {ed.previousPage}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="cursor-not-allowed border-b border-stone-200 pb-1 font-medium text-stone-400"
                  >
                    {ed.previousPage}
                  </span>
                )}
                {currentPage < pageCount ? (
                  <Link
                    href={pageHref(currentPage + 1)}
                    className="border-b border-rose-300 pb-1 font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
                  >
                    {ed.nextPage}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="cursor-not-allowed border-b border-stone-200 pb-1 font-medium text-stone-400"
                  >
                    {ed.nextPage}
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </section>
      ) : resources.length === 0 ? (
        <div className="mt-16">
          <ResourcesEmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      ) : (
        <section aria-labelledby="resource-directory" className="mt-20 md:mt-24">
          <h2
            id="resource-directory"
            className="font-display text-[clamp(2.5rem,5vw,4rem)] font-medium leading-none tracking-[-0.02em] text-plum-900"
          >
            {ed.directoryHeading}
          </h2>
          {sections.map(({ cluster, recommended, rest }) => (
            <ResourceSection
              key={cluster.key}
              id={`res-${cluster.key}`}
              label={ed.clusters[cluster.key].label}
              intro={ed.clusters[cluster.key].intro}
              recommended={recommended}
              rest={rest}
              recommendedHint={ed.recommendedHint}
              entryLabels={entryLabels}
              showMoreLabel={ed.showMore}
              showLessLabel={ed.showLess}
            />
          ))}
        </section>
      )}
    </article>
  );
}

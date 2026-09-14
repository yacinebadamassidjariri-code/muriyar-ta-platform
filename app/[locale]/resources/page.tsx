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
  isPublicResourceThemeCategory,
  publicResourceThemeCategoryName,
  regionRank,
  isLocalRegion,
  isRecommended,
} from "@/components/resources/content";
import type { SectionEntry } from "@/components/resources/resource-section";
import { ResourceEntry } from "@/components/resources/resource-entry";
import { CrisisCallout } from "@/components/resources/crisis-callout";
import { SearchBar } from "@/components/resources/search-bar";
import { ResourcesEmptyState } from "@/components/resources/empty-state";
import { CategoryNav } from "@/components/resources/category-nav";
import styles from "@/components/resources/resources.module.css";

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

  const queriedResources = searching
    ? await listResources({ categoryId: catId, q })
    : [];

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

  const selectedCategory = themeCategories.find(
    (category) => category.category_id === catId,
  );
  const selectedCluster = selectedCategory
    ? RESOURCE_CLUSTERS.find((cluster) =>
        cluster.categorySlugs.includes(selectedCategory.slug),
      )
    : undefined;
  const byResultOrder = (a: Resource, b: Resource): number =>
    Number(isRecommended(b.name, selectedCluster?.recommend)) -
      Number(isRecommended(a.name, selectedCluster?.recommend)) ||
    byLocalFirst(a, b);
  const results = resources.slice().sort(byResultOrder).map(toEntry);
  const resultsHeading = selectedCategory && q
    ? ed.resultsForCategorySearch(selectedCategory.name, q)
    : selectedCategory
      ? ed.resultsForCategory(selectedCategory.name)
      : q
        ? ed.resultsForSearch(q)
        : ed.resultsHeading;
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

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{ed.heroEyebrow}</p>
          <h1>{ed.heroTitle}</h1>
          <p className={styles.heroIntro}>{ed.intro}</p>
        </header>

      <CrisisCallout
        heading={ed.crisisHeading}
        body={ed.crisisBody}
        cta={ed.crisisCta}
      />

      <section aria-label={ed.browseHeading} className={styles.controls}>
        <div>
          <p className={styles.controlLabel}>{ed.browseHeading}</p>
          <CategoryNav
            categories={themeCategories}
            activeCategoryId={catId}
            q={q}
            allLabel={t("allCategories")}
            ariaLabel={ed.categoryNavLabel}
            showAll={searching}
          />
        </div>
        <div>
          <p className={styles.controlLabel}>{ed.searchHeading}</p>
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
        <section aria-labelledby="res-results" className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2 id="res-results" className={styles.sectionTitle}>
              {resultsHeading}
            </h2>
            <Link href="/resources" className={styles.backLink}>{ed.clearResults}</Link>
          </div>
          {results.length === 0 ? (
            <div>
              <ResourcesEmptyState title={ed.emptyTitle} body={ed.emptyBody} />
            </div>
          ) : (
            <div className={styles.entryGroup}>
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
              className={styles.pagination}
            >
              <p>{ed.pageSummary(currentPage, pageCount)}</p>
              <div className={styles.paginationControls}>
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(currentPage - 1)}
                    className={styles.paginationLink}
                  >
                    {ed.previousPage}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={styles.paginationDisabled}
                  >
                    {ed.previousPage}
                  </span>
                )}
                {currentPage < pageCount ? (
                  <Link
                    href={pageHref(currentPage + 1)}
                    className={styles.paginationLink}
                  >
                    {ed.nextPage}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={styles.paginationDisabled}
                  >
                    {ed.nextPage}
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </section>
      ) : (
        <p className={styles.choosePrompt}>{ed.choosePrompt}</p>
      )}
        </div>
    </main>
  );
}

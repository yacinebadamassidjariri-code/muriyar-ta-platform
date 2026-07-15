import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
import { BotanicalCorner, FloralSeparator } from "@/components/home/botanical";

export const revalidate = 300;

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
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "resources" });
  const ed =
    resourcesEditorial[locale as keyof typeof resourcesEditorial] ??
    resourcesEditorial.en;

  const activeCategoryId = sp.category ? Number(sp.category) : null;
  const catId = Number.isFinite(activeCategoryId as number)
    ? (activeCategoryId as number)
    : null;
  const q = sp.q?.trim() || null;
  const searching = !!q || catId != null;

  const [categories, resources] = await Promise.all([
    listCategories(),
    listResources({ categoryId: catId, q }),
  ]);

  const regionLabels = await getRegionLabels(
    resources
      .map((r) => r.geographic_region_id)
      .filter((id): id is number => id !== null),
  );
  const catSlug = new Map(categories.map((c) => [c.category_id, c.slug]));

  const regionOf = (r: Resource): string | undefined =>
    r.geographic_region_id != null
      ? regionLabels.get(r.geographic_region_id)
      : undefined;

  const toEntry = (r: Resource): SectionEntry => {
    const region = regionOf(r);
    return {
      resourceId: r.resource_id,
      resource: r,
      regionLabel: region,
      isLocal: isLocalRegion(region),
    };
  };

  const byLocalFirst = (a: Resource, b: Resource): number =>
    regionRank(regionOf(a)) - regionRank(regionOf(b));

  const entryLabels = { visit: ed.visit, localTag: ed.localTag };

  // Group resources into the editorial "need" clusters (presentation only).
  const byCluster = new Map<string, Resource[]>();
  if (!searching) {
    const seenByCluster = new Map<string, Set<string>>();
    for (const r of resources) {
      const categoryIds =
        r.category_ids.length > 0
          ? r.category_ids
          : r.category_id != null
            ? [r.category_id]
            : [];
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

  return (
    <div className="relative mx-auto w-full max-w-3xl px-5 py-16 md:py-20">
      <BotanicalCorner className="pointer-events-none absolute -right-4 top-10 hidden h-20 w-20 text-rose-200 md:block" />

      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
          {ed.heroEyebrow}
        </p>
        <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl">
          {t("listTitle")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-charcoal-500">
          {ed.intro}
        </p>
      </header>

      {/* Trust statement — Muriyar Ta curates but does not provide services. */}
      <p className="mt-6 max-w-2xl border-l border-rose-200 pl-5 leading-relaxed text-charcoal-700">
        {ed.trust}
      </p>

      <CrisisCallout
        heading={ed.crisisHeading}
        body={ed.crisisBody}
        cta={ed.crisisCta}
      />

      <FloralSeparator className="my-12 text-rose-200" />

      <div className="max-w-md">
        <SearchBar
          label={ed.searchLabel}
          placeholder={ed.searchPlaceholder}
          submitLabel={ed.searchSubmit}
          defaultValue={q ?? ""}
          action={`/${locale}/resources`}
        />
      </div>

      {searching ? (
        <section aria-labelledby="res-results" className="mt-12">
          <h2
            id="res-results"
            className="font-display text-2xl font-medium text-plum-800"
          >
            {ed.resultsHeading}
          </h2>
          {results.length === 0 ? (
            <div className="mt-6">
              <ResourcesEmptyState title={ed.emptyTitle} body={ed.emptyBody} />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-stone-200/60 border-t border-stone-200/60">
              {results.map((e) => (
                <ResourceEntry
                  key={e.resourceId}
                  resource={e.resource}
                  regionLabel={e.regionLabel}
                  isLocal={e.isLocal}
                  labels={entryLabels}
                />
              ))}
            </div>
          )}
        </section>
      ) : resources.length === 0 ? (
        <div className="mt-12">
          <ResourcesEmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      ) : (
        sections.map(({ cluster, recommended, rest }) => (
          <ResourceSection
            key={cluster.key}
            id={`res-${cluster.key}`}
            label={ed.clusters[cluster.key].label}
            intro={ed.clusters[cluster.key].intro}
            recommended={recommended}
            rest={rest}
            recommendedHint={ed.recommendedHint}
            entryLabels={entryLabels}
          />
        ))
      )}
    </div>
  );
}

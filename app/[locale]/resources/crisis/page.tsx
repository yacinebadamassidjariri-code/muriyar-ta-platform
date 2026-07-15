import type { Metadata } from "next";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  listCrisisResources,
  getRegionLabels,
  type Resource,
} from "@/lib/data/resources";
import {
  resourcesEditorial,
  regionRank,
  isLocalRegion,
} from "@/components/resources/content";
import { ResourceEntry } from "@/components/resources/resource-entry";
import { ResourcesEmptyState } from "@/components/resources/empty-state";
import { FloralSeparator } from "@/components/home/botanical";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resources" });
  return { title: t("crisisTitle"), description: t("crisisSubtitle") };
}

export default async function CrisisResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "resources" });
  const ed =
    resourcesEditorial[locale as keyof typeof resourcesEditorial] ??
    resourcesEditorial.en;

  const resources = await listCrisisResources();
  const regionLabels = await getRegionLabels(
    resources
      .map((r) => r.geographic_region_id)
      .filter((id): id is number => id !== null),
  );

  const regionOf = (r: Resource): string | undefined =>
    r.geographic_region_id != null
      ? regionLabels.get(r.geographic_region_id)
      : undefined;
  const ordered = resources
    .slice()
    .sort((a, b) => regionRank(regionOf(a)) - regionRank(regionOf(b)));

  const entryLabels = { visit: ed.visit, localTag: ed.localTag };

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16 md:py-20">
      <Link
        href="/resources"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 transition-colors hover:text-plum-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToAll")}
      </Link>

      <header className="mt-8 max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
          <LifeBuoy className="h-4 w-4 text-rose-500" aria-hidden="true" />
          {t("crisisHeading")}
        </p>
        <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl">
          {t("crisisTitle")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-charcoal-500">
          {t("crisisSubtitle")}
        </p>
      </header>

      <FloralSeparator className="my-10 w-40 max-w-full text-rose-200" />

      {ordered.length === 0 ? (
        <ResourcesEmptyState
          title={t("crisisEmptyTitle")}
          body={t("crisisEmptyBody")}
        />
      ) : (
        <div className="divide-y divide-stone-200/60 border-t border-stone-200/60">
          {ordered.map((r) => (
            <ResourceEntry
              key={r.resource_id}
              resource={r}
              regionLabel={regionOf(r)}
              isLocal={isLocalRegion(regionOf(r))}
              labels={entryLabels}
            />
          ))}
        </div>
      )}
    </article>
  );
}

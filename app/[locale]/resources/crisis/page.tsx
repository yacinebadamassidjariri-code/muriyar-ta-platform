import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
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
import styles from "@/components/resources/resources.module.css";

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
    <main className={styles.page}>
      <article className={styles.crisisShell}>
      <Link
        href="/resources"
        className={styles.backLink}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToAll")}
      </Link>

      <header className={styles.crisisHeader}>
        <h1 className={styles.crisisTitle}>
          {t("crisisTitle")}
        </h1>
        <p className={styles.crisisIntro}>
          {t("crisisSubtitle")}
        </p>
      </header>

      {ordered.length === 0 ? (
        <ResourcesEmptyState
          title={t("crisisEmptyTitle")}
          body={t("crisisEmptyBody")}
        />
      ) : (
        <div className={styles.crisisList}>
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
    </main>
  );
}

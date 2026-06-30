import type { Metadata } from "next";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { listCrisisResources, getRegionLabels } from "@/lib/data/resources";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourcesEmptyState } from "@/components/resources/empty-state";

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

  const resources = await listCrisisResources();
  const regionLabels = await getRegionLabels(
    resources
      .map((r) => r.geographic_region_id)
      .filter((id): id is number => id !== null),
  );

  const cardLabels = {
    visitWebsite: t("visitWebsite"),
    verified: t("verified"),
    lastVerified: t("lastVerified"),
    region: t("region"),
    languages: t("languages"),
    featured: t("featured"),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link
        href="/resources"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToAll")}
      </Link>

      <header className="mt-6 max-w-2xl">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-ink md:text-4xl">
          <LifeBuoy className="h-7 w-7 text-danger" aria-hidden="true" />
          {t("crisisTitle")}
        </h1>
        <p className="mt-2 text-ink-soft">{t("crisisSubtitle")}</p>
      </header>

      <div className="mt-8">
        {resources.length === 0 ? (
          <ResourcesEmptyState
            title={t("crisisEmptyTitle")}
            body={t("crisisEmptyBody")}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <li key={r.resource_id}>
                <ResourceCard
                  resource={r}
                  locale={locale}
                  regionLabel={
                    r.geographic_region_id != null
                      ? regionLabels.get(r.geographic_region_id)
                      : undefined
                  }
                  labels={cardLabels}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
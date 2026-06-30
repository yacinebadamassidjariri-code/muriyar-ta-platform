import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  listCategories,
  listResources,
  getRegionLabels,
} from "@/lib/data/resources";
import { CategoryNav } from "@/components/resources/category-nav";
import { SearchBar } from "@/components/resources/search-bar";
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

  const activeCategoryId = sp.category ? Number(sp.category) : null;
  const q = sp.q?.trim() || null;

  const [categories, resources] = await Promise.all([
    listCategories(),
    listResources({
      categoryId: Number.isFinite(activeCategoryId as number)
        ? (activeCategoryId as number)
        : null,
      q,
    }),
  ]);

  const regionLabels = await getRegionLabels(
    resources
      .map((r) => r.geographic_region_id)
      .filter((id): id is number => id !== null),
  );
  const categoryById = new Map(categories.map((c) => [c.category_id, c.name]));

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
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">
          {t("listTitle")}
        </h1>
        <p className="mt-2 text-ink-soft">{t("listSubtitle")}</p>

        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <LifeBuoy className="h-4 w-4 text-danger" aria-hidden="true" />
          <span className="font-semibold text-ink">{t("crisisHeading")}</span>
          <Link
            href="/resources/crisis"
            className="font-semibold text-brand-700 underline"
          >
            {t("crisisLink")}
          </Link>
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <SearchBar
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          submitLabel={t("searchSubmit")}
          defaultValue={q ?? ""}
          activeCategoryId={activeCategoryId}
          action={`/${locale}/resources`}
        />
        <CategoryNav
          categories={categories}
          activeCategoryId={activeCategoryId}
          q={q}
          allLabel={t("allCategories")}
        />
      </div>

      <div className="mt-8">
        {resources.length === 0 ? (
          <ResourcesEmptyState
            title={t("emptyTitle")}
            body={q ? t("emptyBodySearch", { q }) : t("emptyBody")}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <li key={r.resource_id}>
                <ResourceCard
                  resource={r}
                  locale={locale}
                  categoryLabel={
                    r.category_id != null
                      ? categoryById.get(r.category_id)
                      : undefined
                  }
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
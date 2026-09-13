import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedStories } from "@/lib/data/stories";
import { type Locale } from "@/lib/i18n/routing";
import { storiesEditorial } from "@/components/stories/content";
import { StoriesArchiveView } from "@/components/stories/story-experience";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories" });
  return { title: t("listTitle"), description: t("listSubtitle") };
}

export default async function StoriesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const editorial = storiesEditorial[locale as Locale] ?? storiesEditorial.en;
  const [t, stories] = await Promise.all([
    getTranslations({ locale, namespace: "stories" }),
    listPublishedStories(locale),
  ]);

  return <StoriesArchiveView stories={stories} labels={{ ...editorial, title: t("listTitle"), subtitle: t("listSubtitle") }} />;
}

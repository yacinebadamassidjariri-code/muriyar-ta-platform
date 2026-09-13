import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedStoryBySlug } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { type Locale } from "@/lib/i18n/routing";
import { storiesEditorial } from "@/components/stories/content";
import { hasPublicAttribution, StoryDetailView } from "@/components/stories/story-experience";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  if (!story) {
    const t = await getTranslations({ locale, namespace: "stories" });
    return { title: t("notFoundTitle") };
  }
  return { title: story.seo_title || story.title, description: story.seo_description || deriveExcerpt(story.body_text, 160) };
}

export default async function StoryDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const story = await getPublishedStoryBySlug(slug);
  if (!story) notFound();

  const [t, nav] = await Promise.all([
    getTranslations({ locale, namespace: "stories" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const editorial = storiesEditorial[locale as Locale] ?? storiesEditorial.en;
  const attribution = hasPublicAttribution(story.author_display)
    ? t("authoredBy", { author: story.author_display })
    : null;

  return <StoryDetailView story={story} locale={locale} labels={{ back: t("back"), moreStories: editorial.moreStories, shareStory: nav("submit"), attribution }} />;
}

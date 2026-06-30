import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getPublishedStoryBySlug } from "@/lib/data/stories";
import { StoryMeta } from "@/components/stories/story-meta";
import { deriveExcerpt } from "@/lib/utils/excerpt";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  if (!story) {
    const t = await getTranslations({ locale, namespace: "stories" });
    return { title: t("notFoundTitle") };
  }
  return {
    title: story.seo_title || story.title,
    description: story.seo_description || deriveExcerpt(story.body_text, 160),
  };
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "stories" });

  const story = await getPublishedStoryBySlug(slug);
  if (!story) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">{story.title}</h1>
        <div className="mt-3">
          <StoryMeta
            publishedAt={story.published_at}
            tags={story.tags}
            locale={locale}
          />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {t("authoredBy", { author: story.author_display })}
        </p>
      </header>

      <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-ink">
        {story.body_text}
      </div>
    </article>
  );
}
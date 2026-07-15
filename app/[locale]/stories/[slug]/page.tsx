import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getPublishedStoryBySlug } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { storiesEditorial } from "@/components/stories/content";
import { FloralSeparator } from "@/components/home/botanical";

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

/** Locale-aware long date; 'zar' has no guaranteed Intl tag, so it borrows 'en'. */
function formatDate(publishedAt: string, locale: string): string {
  const intlLocale = locale === "zar" ? "en" : locale;
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "long" }).format(
    new Date(publishedAt),
  );
}

/** Whole-minute reading estimate from the body text (~200 words/min, min 1). */
function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
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

  const ed =
    storiesEditorial[locale as keyof typeof storiesEditorial] ?? storiesEditorial.en;
  const theme = story.tags[0]?.name;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 md:py-20">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 transition-colors hover:text-plum-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mt-8">
        <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
          <time dateTime={new Date(story.published_at).toISOString()}>
            {formatDate(story.published_at, locale)}
          </time>
          {" · "}
          {readingMinutes(story.body_text)} {ed.readSuffix}
          {theme ? " · " + theme : null}
        </p>
        <h1 className="mt-4 font-display text-3xl font-medium leading-tight text-plum-800 md:text-[2.6rem]">
          {story.title}
        </h1>
        <p className="mt-4 text-sm text-charcoal-500">
          {t("authoredBy", { author: story.author_display })}
        </p>
      </header>

      <FloralSeparator className="my-8 w-40 max-w-full text-rose-200" />

      <div className="whitespace-pre-wrap text-[1.05rem] leading-relaxed text-charcoal-700 md:leading-loose">
        {story.body_text}
      </div>
    </article>
  );
}

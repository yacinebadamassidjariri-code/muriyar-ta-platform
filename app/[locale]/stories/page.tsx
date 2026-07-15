import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  listPublishedStories,
  type StoryListItem,
} from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { StoriesEmptyState } from "@/components/stories/empty-state";
import { storiesEditorial, type StoriesEditorial } from "@/components/stories/content";
import { BotanicalCorner, FloralSeparator } from "@/components/home/botanical";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories" });
  return { title: t("listTitle"), description: t("listSubtitle") };
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

/**
 * The one quiet metadata line, in the approved order: date · reading time ·
 * theme (when available). Deliberately understated — small, uppercase, stone —
 * so it never competes with the title or the excerpt.
 */
function Dateline({
  story,
  locale,
  ed,
}: {
  story: StoryListItem;
  locale: string;
  ed: StoriesEditorial;
}) {
  const theme = story.tags[0]?.name;
  return (
    <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
      <time dateTime={new Date(story.published_at).toISOString()}>
        {formatDate(story.published_at, locale)}
      </time>
      {" · "}
      {readingMinutes(story.body_text)} {ed.readSuffix}
      {theme ? " · " + theme : null}
    </p>
  );
}

/**
 * The doorway into the archive. The first piece the reader meets: larger type
 * and a longer excerpt so there is room to begin connecting before deciding to
 * read on. It is an entry point, not a ranking — the archive entries below are
 * given the same dignity, only a quieter scale.
 */
function FeaturedStory({
  story,
  locale,
  ed,
}: {
  story: StoryListItem;
  locale: string;
  ed: StoriesEditorial;
}) {
  const excerpt = story.seo_description?.trim() || deriveExcerpt(story.body_text, 360);
  return (
    <article>
      <Dateline story={story} locale={locale} ed={ed} />
      <h2 className="mt-4 font-display text-[2rem] font-medium leading-tight text-plum-800 md:text-[2.4rem]">
        <Link
          href={`/stories/${story.slug}`}
          className="transition-colors hover:text-plum-900"
        >
          {story.title}
        </Link>
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-charcoal-500">{excerpt}</p>
    </article>
  );
}

/**
 * One entry in the archive. Every entry shares this exact treatment — same
 * title scale, a genuine excerpt, the same quiet metadata — so no story reads
 * as more or less important than another. Rhythm comes from spacing and the
 * hairline divider above each entry, not from changing any entry's prominence.
 */
function ArchiveEntry({
  story,
  locale,
  ed,
}: {
  story: StoryListItem;
  locale: string;
  ed: StoriesEditorial;
}) {
  const excerpt = story.seo_description?.trim() || deriveExcerpt(story.body_text, 240);
  return (
    <article className="py-10">
      <Dateline story={story} locale={locale} ed={ed} />
      <h3 className="mt-3 font-display text-2xl font-medium leading-snug text-plum-800">
        <Link
          href={`/stories/${story.slug}`}
          className="transition-colors hover:text-plum-900"
        >
          {story.title}
        </Link>
      </h3>
      <p className="mt-3 leading-relaxed text-charcoal-500">{excerpt}</p>
    </article>
  );
}

export default async function StoriesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "stories" });
  const ed =
    storiesEditorial[locale as keyof typeof storiesEditorial] ?? storiesEditorial.en;

  const stories = await listPublishedStories(locale);

  const featured = stories[0];
  const rest = stories.slice(1);

  // One gentle "page-turn" breath in the middle of a longer archive.
  const breakAt = rest.length > 6 ? Math.ceil(rest.length / 2) : rest.length;
  const firstHalf = rest.slice(0, breakAt);
  const secondHalf = rest.slice(breakAt);

  return (
    <div className="relative mx-auto w-full max-w-2xl px-5 py-16 md:py-24">
      <BotanicalCorner className="pointer-events-none absolute -right-4 top-8 hidden h-20 w-20 text-rose-200 md:block" />

      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
          {ed.heroEyebrow}
        </p>
        <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl">
          {t("listTitle")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-charcoal-500">
          {t("listSubtitle")}
        </p>
      </header>

      {stories.length === 0 ? (
        <div className="mt-14">
          <StoriesEmptyState
            title={ed.emptyTitle}
            body={ed.emptyBody}
            ctaLabel={ed.emptyCta}
          />
        </div>
      ) : (
        <>
          {/* The transition: a quiet archival note hands the reader from the
              introduction into the archive, so the page never drops straight
              from heading into a list. */}
          <div className="mt-16 md:mt-20">
            <p className="mx-auto max-w-md text-center font-display text-lg leading-relaxed text-plum-700 md:text-xl">
              {ed.archiveNote}
            </p>
            <FloralSeparator className="mt-8 text-rose-200" />
          </div>

          {featured ? (
            <div className="mt-14 md:mt-16">
              <FeaturedStory story={featured} locale={locale} ed={ed} />
            </div>
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-4">
              <div className="divide-y divide-stone-200/60 border-t border-stone-200/60">
                {firstHalf.map((s) => (
                  <ArchiveEntry key={s.story_id} story={s} locale={locale} ed={ed} />
                ))}
              </div>

              {secondHalf.length > 0 ? (
                <>
                  <FloralSeparator className="my-4 text-rose-200" />
                  <div className="divide-y divide-stone-200/60 border-t border-stone-200/60">
                    {secondHalf.map((s) => (
                      <ArchiveEntry key={s.story_id} story={s} locale={locale} ed={ed} />
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

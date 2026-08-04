import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  HeartHandshake,
  Languages,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import {
  getFeaturedEpisode,
  getPodcastPlaybackUrl,
} from "@/lib/data/podcast";
import { StoryMeta } from "@/components/stories/story-meta";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HomeSection } from "@/components/home/home-section";
import { homeCopy } from "@/components/home/content";
import {
  BotanicalSprig,
  BotanicalCorner,
  FloralSeparator,
  PencilStroke,
} from "@/components/home/botanical";
import { FullHomeHeroMedia } from "@/components/home/full-home-hero-media";
import { StoryImagePlaceholder } from "@/components/home/story-image-placeholder";

const missionIcons = [ShieldCheck, Languages, HeartHandshake, BarChart3] as const;

function StoryLanguageBadge({ languageCode }: { languageCode: string }) {
  return (
    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-plum-700">
      {languageCode.toUpperCase()}
    </span>
  );
}

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);

  const t = await getTranslations();
  const c = homeCopy[locale] ?? homeCopy.en;

  // Newest stories + the featured podcast episode, via existing data readers.
  const [latest, featuredEpisode] = await Promise.all([
    listHomepageStories(4),
    getFeaturedEpisode(locale),
  ]);
  // Signed artwork URL for the featured episode (existing reader; may be null).
  const episodeArtwork = featuredEpisode
    ? await getPodcastPlaybackUrl(featuredEpisode.episode_id, "artwork")
    : null;
  // Featured-first editorial split: the newest story leads, the rest support it.
  const [featuredStory, ...supportingStories] = latest;
  // Episode summary as the editorial pull quote (existing model fields only).
  const episodeSummary =
    featuredEpisode?.episode_summary?.trim() ||
    featuredEpisode?.description?.trim() ||
    "";

  return (
    <>
      {/* ---------------- Full-width editorial video hero ---------------- */}
      <section
        aria-labelledby="full-home-hero-title"
        className="relative left-1/2 isolate -mt-8 min-h-[calc(100svh-4.375rem)] w-dvw -translate-x-1/2 overflow-hidden border-b border-cream-100/40 bg-[#2D2038]"
      >
        <FullHomeHeroMedia />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#2D2038]/20 sm:bg-[#2D2038]/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,17,33,0.97)_0%,rgba(45,32,56,0.89)_34%,rgba(45,32,56,0.58)_58%,rgba(45,32,56,0.16)_100%)] sm:bg-[linear-gradient(90deg,rgba(28,17,33,0.98)_0%,rgba(45,32,56,0.88)_36%,rgba(45,32,56,0.4)_64%,rgba(45,32,56,0.08)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#24192d]/35 to-transparent"
        />

        <div className="relative mx-auto flex min-h-[calc(100svh-4.375rem)] w-full max-w-[80rem] items-center px-6 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <div className="flex w-full max-w-[42rem] flex-col justify-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-rose-200 sm:text-xs">
              {t("home.hero.eyebrow")}
            </p>
            <PencilStroke className="mt-3 h-1 w-9 text-rose-200" />

            <h1
              id="full-home-hero-title"
              className="mt-7 max-w-[39rem] text-[clamp(3.15rem,7.2vw,5.75rem)] font-medium leading-[0.96] tracking-[-0.025em] text-cream-50 [font-family:var(--font-display),Georgia,serif]"
            >
              {t.rich("home.hero.title", {
                line: (chunks) => (
                  <span className="block">
                    {chunks}
                    {" "}
                  </span>
                ),
                emphasis: (chunks) => (
                  <em className="font-normal text-rose-200">{chunks}</em>
                ),
              })}
            </h1>

            <p className="mt-7 max-w-[36rem] text-base leading-[1.65] text-cream-50/90 md:text-[1.08rem]">
              {t("home.hero.subtitle")}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-5">
              <Button
                asChild
                className="min-h-14 rounded-md bg-[#B96880] px-6 text-base text-white shadow-none hover:bg-[#A85670] focus-visible:outline-cream-50"
              >
                <Link href="/submit">
                  {t("home.hero.ctaShareStory")}
                  <span aria-hidden="true">→</span>
                </Link>
              </Button>
              <Link
                href="/stories"
                className="inline-flex items-center gap-2 rounded-sm border-b border-rose-200/80 pb-1 text-sm font-medium text-cream-50 transition-colors duration-200 hover:border-rose-100 hover:text-rose-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream-50 sm:text-base"
              >
                {t("home.hero.ctaExploreStories")}
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-10 flex max-w-lg items-center gap-3 text-cream-50/85 sm:mt-12">
              <BotanicalSprig className="h-8 w-6 shrink-0 text-rose-200" />
              <p className="text-sm leading-relaxed">
                {t("home.hero.reassurance")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Mission (editorial feature) ---------------- */}
      <section
        aria-labelledby="mission-heading"
        className="relative mt-20 overflow-hidden md:mt-28"
      >
        <BotanicalCorner className="absolute -right-5 -top-5 hidden h-44 w-44 rotate-90 text-rose-200/55 md:block" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
            {c.mission.eyebrow}
          </p>
          <h2
            id="mission-heading"
            className="mt-4 max-w-2xl text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.025em] text-plum-900 [font-family:var(--font-display),Georgia,serif]"
          >
            {c.mission.title}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-[1.7] text-charcoal-500">
            {t("footer.mission")}
          </p>
          <FloralSeparator className="mt-8 max-w-md text-rose-200" />
        </div>

        <ul className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.mission.pillars.map((pillar, index) => {
            const Icon = missionIcons[index];

            return (
              <li
                key={pillar.title}
                className="flex min-h-64 flex-col rounded-2xl border border-rose-100/90 bg-cream-50/65 p-6 shadow-[0_18px_45px_-34px_rgba(64,38,56,0.45)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-plum-700">
                  <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold leading-tight text-plum-900 [font-family:var(--font-display),Georgia,serif]">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.7] text-charcoal-500">
                  {pillar.body}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- Latest Stories ---------------- */}
      <section
        aria-labelledby="latest-stories-heading"
        className="relative left-1/2 mt-20 w-dvw -translate-x-1/2 bg-[#FBF7F5] py-16 md:mt-28 md:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
                {c.latest.eyebrow}
              </p>
              <h2
                id="latest-stories-heading"
                className="mt-3 text-[clamp(2.75rem,5vw,4rem)] font-medium leading-none tracking-[-0.025em] text-plum-900 [font-family:var(--font-display),Georgia,serif]"
              >
                {c.latest.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal-500">
                {c.latest.description}
              </p>
              <PencilStroke className="mt-4 h-1 w-12 text-rose-300" />
            </div>

            <Link
              href="/stories"
              className="inline-flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-plum-700 transition-colors duration-200 hover:text-plum-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
            >
              {c.latest.viewAll}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {latest.length === 0 ? (
            <Card className="mt-10 flex flex-col items-center gap-3 border-rose-100 bg-cream-50/80 p-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-plum-50 text-plum-700">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold text-plum-800">
                {c.latest.emptyTitle}
              </h3>
              <p className="max-w-md text-charcoal-500">{c.latest.emptyBody}</p>
              <Button asChild variant="secondary" className="mt-2">
                <Link href="/submit">
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  {t("nav.submit")}
                </Link>
              </Button>
            </Card>
          ) : (
            <div
              className={`mt-8 grid items-start gap-6 ${
                supportingStories.length > 0
                  ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.95fr)]"
                  : ""
              }`}
            >
              <article>
                <Link
                  href={`/stories/${featuredStory.slug}`}
                  className="group block overflow-hidden rounded-[1.25rem] border border-rose-100 bg-cream-50 shadow-[0_24px_65px_-42px_rgba(64,38,56,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
                >
                  <StoryImagePlaceholder
                    variant="featured"
                    index={0}
                    className="aspect-[16/7]"
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-plum-600">
                        {c.latest.eyebrow}
                      </p>
                      <StoryLanguageBadge
                        languageCode={featuredStory.language_code}
                      />
                    </div>
                    <h3 className="mt-3 break-words text-3xl font-medium leading-[1.05] text-plum-900 transition-colors duration-200 group-hover:text-plum-700 [font-family:var(--font-display),Georgia,serif] sm:text-4xl">
                      {featuredStory.title}
                    </h3>
                    <p className="mt-4 line-clamp-3 text-base leading-[1.65] text-charcoal-500">
                      {deriveExcerpt(
                        featuredStory.seo_description?.trim() ||
                          featuredStory.body_text,
                        260,
                      )}
                    </p>
                    <div className="mt-5 border-t border-rose-100 pt-4 [&_div]:text-xs [&_span]:border-rose-200 [&_span]:bg-transparent [&_span]:px-2.5 [&_span]:py-0.5 [&_span]:text-xs [&_span]:font-medium [&_span]:text-plum-700">
                      <StoryMeta
                        publishedAt={featuredStory.published_at}
                        tags={featuredStory.tags}
                        locale={locale}
                      />
                    </div>
                  </div>
                </Link>
              </article>

              {supportingStories.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {supportingStories.map((story, index) => (
                    <li key={story.story_id}>
                      <Link
                        href={`/stories/${story.slug}`}
                        className="group grid h-full grid-cols-[6.75rem_minmax(0,1fr)] gap-4 rounded-2xl border border-rose-100 bg-cream-50/90 p-3 shadow-[0_18px_45px_-38px_rgba(64,38,56,0.45)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-plum-600 sm:flex sm:flex-col lg:grid lg:grid-cols-[9rem_minmax(0,1fr)]"
                      >
                        <StoryImagePlaceholder
                          variant="thumbnail"
                          index={index + 1}
                        />
                        <div className="min-w-0 py-1 sm:px-1 sm:pb-2 lg:px-0 lg:pb-1">
                          <StoryLanguageBadge
                            languageCode={story.language_code}
                          />
                          <h3 className="mt-2 break-words text-xl font-medium leading-[1.08] text-plum-900 transition-colors duration-200 group-hover:text-plum-700 [font-family:var(--font-display),Georgia,serif]">
                            {story.title}
                          </h3>
                          <div className="mt-3 [&_div]:gap-y-1 [&_div]:text-xs [&_span]:border-rose-200 [&_span]:bg-transparent [&_span]:px-2 [&_span]:py-0.5 [&_span]:text-[0.68rem] [&_span]:font-medium [&_span]:text-plum-700">
                            <StoryMeta
                              publishedAt={story.published_at}
                              tags={story.tags}
                              locale={locale}
                            />
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          <div className="relative mt-8 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/70 px-6 py-5 sm:px-8 sm:py-6">
            <BotanicalCorner className="absolute -bottom-6 -left-5 h-28 w-28 text-rose-200/60" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-cream-50 text-plum-700">
                  <PenLine className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <p className="max-w-xl text-lg font-semibold leading-snug text-plum-900 [font-family:var(--font-display),Georgia,serif]">
                  {c.share.title}
                </p>
              </div>
              <Button asChild className="shrink-0 bg-plum-800 hover:bg-plum-900">
                <Link href="/submit">
                  {t("nav.submit")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Podcast (featured editorial moment) ---------------- */}
      {featuredEpisode ? (
        <section aria-labelledby="podcast-heading" className="mt-20 md:mt-28">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] md:gap-14 lg:gap-20">
            {/* Episode artwork — existing signed-URL reader; botanical fallback */}
            <div className="mx-auto w-full max-w-md md:mx-0">
              <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-cream-200">
                {episodeArtwork?.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={episodeArtwork.signedUrl}
                    alt=""
                    className="h-full w-full select-none object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BotanicalCorner className="h-24 w-24 text-rose-200" />
                  </div>
                )}
              </div>
            </div>

            {/* Editorial text — quiet, typographic, one listening invitation */}
            <div className="flex flex-col">
              <p className="text-sm font-semibold uppercase tracking-wider text-plum-600">
                {c.podcast.eyebrow}
              </p>
              <h2
                id="podcast-heading"
                className="mt-2 text-2xl font-semibold tracking-tight leading-tight text-plum-800 md:text-3xl"
              >
                {featuredEpisode.title}
              </h2>

              {episodeSummary ? (
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-500 md:text-xl">
                  {episodeSummary}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <Link
                  href={`/podcast/${featuredEpisode.episode_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 transition-colors duration-200 hover:text-plum-800"
                >
                  {c.podcast.listen}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/podcast"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 transition-colors duration-200 hover:text-plum-700"
                >
                  {c.podcast.allEpisodes}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------- Share Your Story CTA (editorial) ---------------- */}
      <section aria-labelledby="share-heading" className="mt-20 md:mt-28">
        <div className="bg-cream-200 px-6 py-16 text-center md:px-10 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <FloralSeparator className="mb-8 w-40 max-w-full text-rose-200" />
            <h2
              id="share-heading"
              className="text-2xl font-semibold leading-tight text-plum-800 md:text-3xl"
            >
              {c.share.title}
            </h2>
            <p className="mt-5 max-w-2xl text-left text-lg leading-relaxed text-charcoal-500">
              {c.share.body}
            </p>

            {/* Reassurances as a calm inline row — no check-mark iconography */}
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs tracking-wide text-charcoal-500">
              {c.share.points.map((point, i) => (
                <li key={point} className="flex items-center gap-3">
                  {i > 0 ? (
                    <span aria-hidden="true" className="text-stone-300">
                      ·
                    </span>
                  ) : null}
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-12">
              <Button asChild size="lg">
                <Link href="/submit">{t("nav.submit")}</Link>
              </Button>
              <p className="mt-3 text-xs text-charcoal-500">{c.share.noAccount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Resources Preview (informational only, now links) ---------------- */}
<HomeSection
  id="resources-preview-heading"
  eyebrow={c.resourcesPreview.eyebrow}
  title={c.resourcesPreview.title}
  description={c.resourcesPreview.description}
  className="mt-20 md:mt-28"
>
  {/* Editorial resource index — no cards; a curated directory driven by
      typography, hierarchy, whitespace and hairline dividers. */}
  <ul className="border-t border-stone-200">
    {c.resourcesPreview.categories.map((cat) => (
      <li key={cat.title}>
        <Link
          href="/resources"
          className="group grid gap-1 border-b border-stone-200 py-6 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 md:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] md:items-baseline md:gap-10 md:py-7"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold leading-snug text-plum-800 transition-colors duration-200 group-hover:text-plum-700">
            {cat.title}
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-plum-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden="true"
            />
          </h3>
          <p className="text-sm leading-relaxed text-charcoal-500 md:text-base">
            {cat.body}
          </p>
        </Link>
      </li>
    ))}
  </ul>
  <p className="mt-8 text-sm italic text-charcoal-500">
    {c.resourcesPreview.note}
  </p>
</HomeSection>

      {/* ---------------- Partner With Us ---------------- */}
<section
  aria-labelledby="partner-heading"
  className="mt-20 py-16 text-center md:mt-28 md:py-24"
>
  <div className="mx-auto flex max-w-2xl flex-col items-center">
    <FloralSeparator className="mb-8 w-40 max-w-full text-rose-200" />
    <p className="text-sm font-semibold uppercase tracking-wider text-plum-600">
      {c.partner.eyebrow}
    </p>
    <h2
      id="partner-heading"
      className="mt-3 text-2xl font-bold leading-tight text-plum-800 md:text-3xl"
    >
      <Link
        href="/partner"
        className="transition-colors duration-200 hover:text-plum-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
      >
        {c.partner.title}
      </Link>
    </h2>
    <p className="mt-5 text-lg leading-relaxed text-charcoal-500">
      {c.partner.body}
    </p>

    {/* Audiences as a quiet inline line — supporting metadata, not badges */}
    <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs tracking-wide text-charcoal-500">
      {c.partner.audiences.map((a, i) => (
        <li key={a} className="flex items-center gap-3">
          {i > 0 ? (
            <span aria-hidden="true" className="text-stone-300">
              ·
            </span>
          ) : null}
          <span>{a}</span>
        </li>
      ))}
    </ul>

    <div className="mt-10">
      <Link
        href="/partner"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 transition-colors duration-200 hover:text-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
      >
        {c.partner.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  </div>
</section>
</>
);
}

import { Play, ArrowRight, Info } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import { listLatestEpisodes } from "@/lib/data/podcast";
import { listCategories } from "@/lib/data/resources";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { FullHomeHeroMedia } from "@/components/home/full-home-hero-media";
import { AgadezCross } from "@/components/home/agadez-cross";
import styles from "@/components/home/full-home.module.css";

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });

  // Parallel data fetches — public views only, no auth required
  const [stories, episodes, categories] = await Promise.all([
    listHomepageStories(3),
    listLatestEpisodes(locale, 3),
    listCategories(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const journeySteps: { num: string; title: string; body: string }[] = (
    t.raw("journey.steps") as any[]
  ).map((s: any) => ({
    num: String(s.num),
    title: String(s.title),
    body: String(s.body),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitBullets: string[] = (t.raw("submitInvite.bullets") as any[]).map(
    String,
  );

  return (
    <div className={styles.page}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="home-hero-title">
        {/* Full-bleed photo/video background */}
        <div className={styles.heroMedia}>
          <FullHomeHeroMedia />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />

        {/* Agadez cross — decorative, top-right */}
        <AgadezCross
          className={styles.heroCrossDecor}
          color="#C8A87A"
          opacity={0.09}
        />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            {/* Eyebrow: short rule · text · short rule */}
            <div className={styles.heroEyebrowRow} aria-hidden="true">
              <span className={styles.heroEyebrowRule} />
              <p className={styles.heroEyebrow}>{t("hero.eyebrow")}</p>
            </div>

            <h1 id="home-hero-title" className={styles.heroTitle}>
              <span>{t("hero.titleLine1")}</span>
              <em>{t("hero.titleLine2")}</em>
            </h1>

            <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/submit">
                {t("hero.ctaShareStory")}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link className={styles.outlineActionLight} href="/stories">
                {t("hero.ctaExploreStories")}
              </Link>
            </div>

            <p className={styles.heroReassurance}>
              <Info aria-hidden="true" />
              {t("hero.reassurance")}
            </p>
          </div>
        </div>

        {/* Scroll indicator — bottom-right */}
        <div className={styles.heroScroll} aria-hidden="true">
          <span className={styles.heroScrollLabel}>SCROLL</span>
          <span className={styles.heroScrollLine} />
        </div>
      </section>

      {/* ── 2. NAME / INTRODUCTION ──────────────────────────────────────────── */}
      <section className={styles.nameSection} aria-labelledby="name-title">
        <div className={styles.nameInner}>
            {/* Decorative divider above */}
          <div className={styles.nameDividerRow} aria-hidden="true">
            <span className={styles.nameDividerLine} />
            <span className={styles.nameDividerDot} />
            <span className={styles.nameDividerLine} />
          </div>

          <p className={styles.nameEyebrow}>{t("name.eyebrow")}</p>

          <h2 id="name-title" className={styles.nameHeading}>
            <span className={styles.nameHeadingLine1}>
              {t("name.titleLine1Start")}
              <em className={styles.nameHeadingItalic}>{t("name.titleLine1Accent")}</em>
              {t("name.titleLine1End")}
            </span>
            <span className={styles.nameHeadingLine2}>{t("name.titleLine2")}</span>
          </h2>

          <p className={styles.nameBody}>{t("name.body")}</p>
          <p className={styles.nameBody2}>{t("name.body2")}</p>

          {/* Decorative divider below */}
          <div className={styles.nameDividerRowBottom} aria-hidden="true">
            <span className={styles.nameDividerLine} />
            <span className={styles.nameDividerDot} />
            <span className={styles.nameDividerLine} />
          </div>
        </div>
      </section>

      {/* ── 3. STATS ROW ────────────────────────────────────────────────────── */}
      <div className={styles.statsStrip} aria-label={t("stats.label")}>
        <div className={styles.statsInner}>
          <div className={styles.statItem}>
            <p className={styles.statNumber}>4</p>
            <p className={styles.statLabel}>{t("stats.languages")}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statNumber}>
              {stories.length > 0 ? `${stories.length}+` : t("stats.storiesEmpty")}
            </p>
            <p className={styles.statLabel}>{t("stats.stories")}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statNumber}>
              {categories.length > 0 ? categories.length : t("stats.categoriesEmpty")}
            </p>
            <p className={styles.statLabel}>{t("stats.categories")}</p>
          </div>
        </div>
      </div>

      {/* ── 4. STORIES GRID ─────────────────────────────────────────────────── */}
      <section className={styles.stories} aria-labelledby="stories-title">
        <div className={styles.storiesInner}>
          <header className={styles.storiesHeader}>
            <div>
              <p className={styles.eyebrow}>{t("stories.eyebrow")}</p>
              <h2 id="stories-title" className={styles.storiesTitle}>
                {t("stories.titleStart")}
                <em>{t("stories.titleItalic")}</em>
              </h2>
            </div>
            <Link className={styles.storiesCta} href="/stories">
              {t("stories.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          {stories.length > 0 ? (
            <ol className={styles.storyGrid}>
              {stories.map((story) => (
                <li key={story.story_id} className={styles.storyCard}>
                  {/* Dark editorial gradient — no photography in published_stories_public view */}
                  {/* Image hook: drop a <Image> or background-image into storyCardBg
                      to add photography without redesigning the card layout. */}
                  <div className={styles.storyCardBg} aria-hidden="true" />
                  <div className={styles.storyCardContent}>
                    {/* Full-card click overlay */}
                    <Link
                      href={`/stories/${story.slug}`}
                      className={styles.storyCardOverlay}
                      aria-label={story.seo_description ?? story.title ?? story.slug}
                    />
                    {story.tags[0]?.name ? (
                      <span className={styles.storyCardTag}>
                        {story.tags[0].name.toUpperCase()}
                      </span>
                    ) : null}
                    <blockquote className={styles.storyCardQuote}>
                      {deriveExcerpt(story.body_text, 200)}
                    </blockquote>
                    <footer className={styles.storyCardMeta}>
                      <span>
                        {story.language_code.charAt(0).toUpperCase() + story.language_code.slice(1)}
                      </span>
                      <span className={styles.storyCardMetaDot} aria-hidden="true">|</span>
                      <Link
                        href={`/stories/${story.slug}`}
                        className={styles.storyCardReadLink}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        {t("stories.readCta")} →
                      </Link>
                    </footer>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.storyEmpty}>{t("stories.empty")}</p>
          )}
        </div>
      </section>

      {/* ── 5. SUBMIT INVITATION ────────────────────────────────────────────── */}
      <section className={styles.submitInvite} aria-labelledby="submit-title">
        <div className={styles.submitInner}>
          {/* Left column */}
          <div className={styles.submitLeft}>
            {/* Eyebrow */}
            <div className={styles.submitEyebrowRow}>
              <span className={styles.submitEyebrowAccent} aria-hidden="true" />
              <p className={styles.eyebrow}>{t("submitInvite.eyebrow")}</p>
            </div>

            <h2 id="submit-title" className={styles.submitHeading}>
              {t("submitInvite.titleStart")}
              <em>{t("submitInvite.titleItalic")}</em>
            </h2>

            <p className={styles.submitBody}>{t("submitInvite.body")}</p>

            <ul className={styles.submitList}>
              {submitBullets.map((bullet, i) => (
                <li key={i} className={styles.submitListItem}>
                  <span className={styles.submitListDiamond} aria-hidden="true">◇</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column — dark card with corner brackets */}
          <div className={styles.submitCard}>
            <span className={styles.submitCardBracketTL} aria-hidden="true" />
            <span className={styles.submitCardBracketTR} aria-hidden="true" />

            <p className={styles.submitCardEyebrow}>{t("submitInvite.cardEyebrow")}</p>
            <h3 className={styles.submitCardTitle}>{t("submitInvite.cardTitle")}</h3>
            <p className={styles.submitCardBody}>{t("submitInvite.cardBody")}</p>

            <Link className={styles.submitCardCta} href="/submit">
              {t("submitInvite.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>

            <p className={styles.submitCardLanguages}>{t("submitInvite.cardLanguages")}</p>

            <span className={styles.submitCardBracketBL} aria-hidden="true" />
            <span className={styles.submitCardBracketBR} aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ── 6. JOURNEY ──────────────────────────────────────────────────────── */}
      <section className={styles.journey} aria-labelledby="journey-title">
        <div className={styles.journeyInner}>
          {/* Centered header */}
          <div className={styles.journeyHeader}>
            <p className={styles.eyebrowLight}>{t("journey.eyebrow")}</p>
            <h2 id="journey-title" className={styles.journeyTitle}>
              {t("journey.title")}
            </h2>
            <p className={styles.journeySubtitle}>{t("journey.subtitle")}</p>
          </div>

          {/* 5-step horizontal flow */}
          <ol className={styles.journeySteps}>
            {journeySteps.map(({ num, title, body }, index) => (
              <li key={title} className={styles.journeyStep}>
                {/* Square step icon */}
                <div
                  className={
                    index === 0
                      ? styles.journeyStepIconFirst
                      : styles.journeyStepIcon
                  }
                  aria-hidden="true"
                >
                  <span>{num === "1" ? "#" : num}</span>
                </div>

                {/* Arrow connector (not on last step) */}
                {index < journeySteps.length - 1 ? (
                  <span className={styles.journeyStepArrow} aria-hidden="true">→</span>
                ) : null}

                <p className={styles.journeyStepNum}>0{index + 1}</p>
                <h3 className={styles.journeyStepTitle}>{title}</h3>
                <p className={styles.journeyStepBody}>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 7. PODCAST TEASER ───────────────────────────────────────────────── */}
      <section className={styles.podcast} aria-labelledby="podcast-title">
        <div className={styles.podcastInner}>
          {/* Left column */}
          <div className={styles.podcastLeft}>
            {/* Play icon eyebrow */}
            <div className={styles.podcastEyebrowRow}>
              <span className={styles.podcastPlayIcon} aria-hidden="true">
                <Play fill="currentColor" />
              </span>
              <p className={styles.eyebrowLight}>{t("podcast.eyebrow")}</p>
            </div>

            <h2 id="podcast-title" className={styles.podcastTitle}>
              <span>{t("podcast.titleLine1")}</span>
              <span>{t("podcast.titleLine2")}</span>
            </h2>

            <p className={styles.podcastBody}>{t("podcast.body")}</p>

            {/* Coming-soon banner */}
            <p className={styles.podcastComingSoon}>
              <span className={styles.podcastComingSoonDot} aria-hidden="true">●</span>
              {t("podcast.comingSoon")}
            </p>

            <Link className={styles.podcastCta} href="/podcast">
              {t("podcast.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {/* Right column — dark episode list */}
          <ol className={styles.episodeList} aria-label={t("podcast.episodesLabel")}>
            {episodes.length > 0
              ? episodes.map((ep, i) => (
                  <li key={ep.episode_id} className={styles.episodeRow}>
                    <span className={styles.episodeNum}>
                      {String(ep.episode_number ?? i + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.episodeInfo}>
                      <h3 className={styles.episodeTitle}>{ep.title}</h3>
                      {ep.duration_seconds ? (
                        <p className={styles.episodeMeta}>
                          {Math.round(ep.duration_seconds / 60)}{" "}
                          {t("podcast.minutesLabel")}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/podcast/${ep.episode_id}`}
                      className={styles.episodeArrow}
                      aria-label={ep.title}
                    >
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))
              : (
                  /* No published episodes yet — single intentional coming-soon panel.
                     Episode rows will appear here automatically once episodes are published. */
                  <li className={styles.episodeEmptyPanel}>
                    <span className={styles.episodeEmptyDot} aria-hidden="true">●</span>
                    <p className={styles.episodeEmptyText}>{t("podcast.episodesComingSoon")}</p>
                  </li>
                )}
          </ol>
        </div>
      </section>

      {/* ── 8. RESOURCES ────────────────────────────────────────────────────── */}
      <section className={styles.resources} aria-labelledby="resources-title">
        <div className={styles.resourcesInner}>
          <p className={styles.eyebrow}>{t("resources.eyebrow")}</p>
          <h2 id="resources-title" className={styles.resourcesTitle}>
            {t("resources.titleStart")}
            <em>{t("resources.titleItalic")}</em>
          </h2>
          <p className={styles.resourcesBody}>{t("resources.body")}</p>

          {categories.length > 0 ? (
            <ul className={styles.categoryPills} aria-label={t("resources.pillsLabel")}>
              {categories.map((cat) => (
                <li key={cat.category_id}>
                  <Link
                    href={`/resources?category=${cat.slug}`}
                    className={styles.categoryPill}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <Link className={styles.resourcesCta} href="/resources">
            {t("resources.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── 9. INSIGHTS ─────────────────────────────────────────────────────── */}
      <section className={styles.insights} aria-labelledby="insights-title">
        <div className={styles.insightsInner}>
          {/* Left — document card preview (coming-soon, no fabricated data) */}
          <div className={styles.insightsCard}>
            <div className={styles.insightsCardHeader}>
              <span className={styles.insightsCardBrandDot} aria-hidden="true" />
              <span className={styles.insightsCardBrand}>MURIYAR TA INSIGHTS</span>
              <span className={styles.insightsCardIssue}>{t("insights.cardComingSoon")}</span>
            </div>
            <div className={styles.insightsCardBody}>
              <p className={styles.insightsCardBodyText}>{t("insights.cardComingSoonBody")}</p>
            </div>
            <p className={styles.insightsCardNote}>{t("insights.dataNote")}</p>
          </div>

          {/* Right — copy */}
          <div className={styles.insightsRight}>
            <div className={styles.insightsEyebrowRow}>
              <span className={styles.insightsEyebrowAccent} aria-hidden="true" />
              <p className={styles.eyebrow}>{t("insights.eyebrow")}</p>
            </div>
            <h2 id="insights-title" className={styles.insightsTitle}>
              {t("insights.titleStart")}
              <em>{t("insights.titleItalic")}</em>
            </h2>
            <p className={styles.insightsBody}>{t("insights.body")}</p>
            <div className={styles.insightsLinks}>
              <Link className={styles.insightsTextLink} href="/insights">
                {t("insights.ctaInsights")} →
              </Link>
              <Link className={styles.insightsTextLink} href="/partner">
                {t("insights.ctaPartner")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA ───────────────────────────────────────────────────── */}
      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        {/* Editorial photography background — thematic, not biographical */}
        <div className={styles.finalCtaPhoto} aria-hidden="true">
          <Image
            src="/editorial/writing-bw.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority={false}
          />
        </div>
        <div className={styles.finalCtaShade} aria-hidden="true" />
        <div className={styles.finalCtaInner}>
          <h2 id="final-cta-title" className={styles.finalCtaHeading}>
            {t("finalCta.titleStart")}
            <em>{t("finalCta.titleItalic")}</em>
          </h2>
          <p className={styles.finalCtaBody}>{t("finalCta.body")}</p>
          <div className={styles.finalCtaActions}>
            <Link className={styles.primaryAction} href="/submit">
              {t("finalCta.ctaShare")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.outlineActionLight} href="/partner">
              {t("finalCta.ctaPartner")}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

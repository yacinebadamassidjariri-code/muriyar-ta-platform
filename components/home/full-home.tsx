import {
  ArrowRight,
  ShieldCheck,
  PenLine,
  UserCheck,
  Shuffle,
  Megaphone,
  Globe,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import { listLatestEpisodes } from "@/lib/data/podcast";
import { listCategories } from "@/lib/data/resources";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { FullHomeHeroMedia } from "@/components/home/full-home-hero-media";
import { AgadezCross, AgadezCrossSmall } from "@/components/home/agadez-cross";
import styles from "@/components/home/full-home.module.css";

/** Journey stages — icons use Lucide; text comes from translations */
const JOURNEY_ICONS = [PenLine, ShieldCheck, UserCheck, Shuffle, Megaphone];

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });

  // Data — all reads from public views only; no auth required
  const [stories, episodes, categories] = await Promise.all([
    listHomepageStories(3),
    listLatestEpisodes(locale, 3),
    listCategories(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const journeySteps: { title: string; body: string }[] = (
    t.raw("journey.steps") as any[]
  ).map((s: any) => ({ title: String(s.title), body: String(s.body) }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitBullets: string[] = (t.raw("submitInvite.bullets") as any[]).map(
    String,
  );

  return (
    <div className={styles.page}>
      {/* ── 1. HERO ───────────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroMedia}>
          <FullHomeHeroMedia />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />

        {/* Agadez cross — decorative, top-right */}
        <AgadezCross
          className={styles.heroCrossDecor}
          color="var(--mt-rust-soft)"
          opacity={0.07}
        />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            {/* Eyebrow with rules on each side */}
            <div className={styles.heroEyebrowRow}>
              <span className={styles.heroEyebrowRule} aria-hidden="true" />
              <p className={styles.heroEyebrow}>{t("hero.eyebrow")}</p>
              <span className={styles.heroEyebrowRule} aria-hidden="true" />
            </div>

            <h1 id="home-hero-title" className={styles.heroTitle}>
              {t("hero.title")}
            </h1>
            <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/submit">
                {t("hero.ctaShareStory")}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link className={styles.textActionLight} href="/stories">
                {t("hero.ctaExploreStories")}
              </Link>
            </div>

            <p className={styles.heroReassurance}>
              <ShieldCheck aria-hidden="true" />
              {t("hero.reassurance")}
            </p>
          </div>
        </div>

        {/* Floating testimonial card — anonymous voice */}
        <aside className={styles.heroTestiCard} aria-label={t("hero.testiLabel")}>
          <p className={styles.heroTestiQuote}>{t("hero.testiQuote")}</p>
          <span className={styles.heroTestiBracket}>{t("hero.testiCredit")}</span>
        </aside>

        {/* Scroll indicator */}
        <div className={styles.heroScroll} aria-hidden="true">
          <span className={styles.heroScrollLine} />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── 2. NAME / INTRODUCTION ────────────────────────────────────── */}
      <section className={styles.nameSection} aria-labelledby="name-title">
        <div className={styles.nameInner}>
          {/* Agadez cross ornament above */}
          <div className={styles.nameCrossRow} aria-hidden="true">
            <span className={styles.nameDividerLine} />
            <AgadezCrossSmall
              className={styles.nameCrossSmall}
              color="var(--mt-rust)"
              opacity={0.18}
            />
            <span className={styles.nameDividerLine} />
          </div>

          <p className={styles.nameKicker}>{t("name.eyebrow")}</p>
          <h2 id="name-title" className={styles.nameHeading}>
            {t("name.titleStart")}
            <em className={styles.nameHeadingAccent}>{t("name.titleAccent")}</em>
            {t("name.titleEnd")}
          </h2>
          <p className={styles.nameSubtext}>{t("name.body")}</p>

          {/* Agadez cross ornament below */}
          <div className={styles.nameCrossRowBottom} aria-hidden="true">
            <span className={styles.nameDividerLine} />
            <AgadezCrossSmall
              className={styles.nameCrossSmall}
              color="var(--mt-rust)"
              opacity={0.18}
            />
            <span className={styles.nameDividerLine} />
          </div>
        </div>
      </section>

      {/* ── 3. STATS ROW ──────────────────────────────────────────────── */}
      <div className={styles.statsStrip} aria-label={t("stats.label")}>
        <div className={styles.statsInner}>
          {/* Language count — confirmed real: 4 supported locales */}
          <div className={styles.statItem}>
            <p className={styles.statNumber}>4</p>
            <p className={styles.statLabel}>{t("stats.languages")}</p>
          </div>
          {/* Story count — from real query */}
          <div className={styles.statItem}>
            <p className={styles.statNumber}>
              {stories.length > 0 ? `${stories.length}+` : t("stats.storiesEmpty")}
            </p>
            <p className={styles.statLabel}>{t("stats.stories")}</p>
          </div>
          {/* Category count — from real resource_categories table */}
          <div className={styles.statItem}>
            <p className={styles.statNumber}>
              {categories.length > 0
                ? categories.length
                : t("stats.categoriesEmpty")}
            </p>
            <p className={styles.statLabel}>{t("stats.categories")}</p>
          </div>
        </div>
      </div>

      {/* ── 4. STORIES GRID ───────────────────────────────────────────── */}
      <section className={styles.stories} aria-labelledby="stories-title">
        <div className={styles.storiesInner}>
          <header className={styles.storiesHeader}>
            <div>
              <p className={styles.eyebrow}>{t("stories.eyebrow")}</p>
              <h2 id="stories-title" className={styles.storiesTitle}>
                {t("stories.title")}
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
                  <div className={styles.storyCardTint} aria-hidden="true" />
                  <div className={styles.storyCardContent}>
                    <Link
                      href={`/stories/${story.slug}`}
                      className={styles.storyCardLink}
                      aria-label={story.seo_description ?? story.slug}
                    />
                    {story.tags[0]?.name ? (
                      <span className={styles.storyCardTag}>
                        {story.tags[0].name}
                      </span>
                    ) : null}
                    <blockquote className={styles.storyCardQuote}>
                      {deriveExcerpt(story.body_text, 180)}
                    </blockquote>
                    <span className={styles.storyCardMeta}>
                      Anonymous · {story.language_code.toUpperCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.storyEmpty}>{t("stories.empty")}</p>
          )}
        </div>
      </section>

      {/* ── 5. SUBMIT INVITATION ──────────────────────────────────────── */}
      <section className={styles.submitInvite} aria-labelledby="submit-invite-title">
        <div className={styles.submitInviteInner}>
          {/* Left — heading + diamond bullet list */}
          <div className={styles.submitInviteLeft}>
            <p className={styles.eyebrow}>{t("submitInvite.eyebrow")}</p>
            <h2 id="submit-invite-title" className={styles.submitInviteHeading}>
              {t("submitInvite.title")}
            </h2>
            <ul className={styles.submitInviteList}>
              {submitBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          {/* Right — dark CTA card */}
          <div className={styles.submitInviteCard}>
            <p className={styles.submitInviteCardEyebrow}>
              {t("submitInvite.cardEyebrow")}
            </p>
            <h3 className={styles.submitInviteCardTitle}>
              {t("submitInvite.cardTitle")}
            </h3>
            <p className={styles.submitInviteCardBody}>
              {t("submitInvite.cardBody")}
            </p>
            <div className={styles.submitInviteCardActions}>
              <Link className={styles.primaryActionLarge} href="/submit">
                {t("submitInvite.cta")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.submitInviteSafety}>
              <ShieldCheck aria-hidden="true" />
              {t("submitInvite.safety")}
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. JOURNEY ────────────────────────────────────────────────── */}
      <section className={styles.journey} aria-labelledby="journey-title">
        <div className={styles.journeyInner}>
          <header className={styles.journeyHeader}>
            <div className={styles.journeyHeaderText}>
              <p className={styles.eyebrowLight}>{t("journey.eyebrow")}</p>
              <h2 id="journey-title" className={styles.journeyTitle}>
                {t("journey.title")}
              </h2>
            </div>
            <Link className={styles.textActionLight} href="/submit">
              {t("journey.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <ol className={styles.journeySteps}>
            {journeySteps.map(({ title, body }, index) => {
              const Icon = JOURNEY_ICONS[index] ?? Globe;
              return (
                <li key={title} className={styles.journeyStep}>
                  <div className={styles.journeyStepIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <span className={styles.journeyStepNum} aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3 className={styles.journeyStepTitle}>{title}</h3>
                  <p className={styles.journeyStepBody}>{body}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <AgadezCross
          className={styles.journeyCrossDecor}
          color="var(--mt-rust-bright)"
          opacity={0.06}
        />
      </section>

      {/* ── 7. PODCAST ────────────────────────────────────────────────── */}
      <section className={styles.podcast} aria-labelledby="podcast-title">
        <div className={styles.podcastInner}>
          <div className={styles.podcastLeft}>
            <p className={styles.eyebrowLight}>{t("podcast.eyebrow")}</p>
            <h2 id="podcast-title" className={styles.displayHeadingLight}>
              {t("podcast.title")}
            </h2>
            <p className={styles.podcastBody}>{t("podcast.body")}</p>
            <Link className={styles.secondaryAction} href="/podcast">
              {t("podcast.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {/* Episode list or coming-soon placeholders */}
          <ol className={styles.episodeList} aria-label={t("podcast.episodesLabel")}>
            {episodes.length > 0
              ? episodes.map((ep, i) => (
                  <li key={ep.episode_id} className={styles.episodeRow}>
                    <div>
                      <span className={styles.episodeNum}>
                        {t("podcast.episodeLabel")} {ep.episode_number ?? i + 1}
                      </span>
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
                      className={styles.episodeRowLink}
                      aria-label={ep.title}
                    >
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))
              : /* Coming-soon placeholders matching Figma intent */
                [
                  t("podcast.soon1"),
                  t("podcast.soon2"),
                  t("podcast.soon3"),
                ].map((label, i) => (
                  <li key={i} className={styles.episodeRow}>
                    <div>
                      <span className={styles.episodeNum}>
                        {t("podcast.episodeLabel")} 0{i + 1}
                      </span>
                      <h3 className={styles.episodeTitle}>{label}</h3>
                    </div>
                    <span className={styles.episodeBadge}>{t("podcast.soonBadge")}</span>
                  </li>
                ))}
          </ol>
        </div>
      </section>

      {/* ── 8. RESOURCES ──────────────────────────────────────────────── */}
      <section className={styles.resources} aria-labelledby="resources-title">
        <div className={styles.resourcesInner}>
          <header className={styles.resourcesHeader}>
            <div>
              <p className={styles.eyebrow}>{t("resources.eyebrow")}</p>
              <h2 id="resources-title" className={styles.resourcesTitle}>
                {t("resources.title")}
              </h2>
            </div>
            <Link className={styles.resourcesCta} href="/resources">
              {t("resources.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

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

          <p className={styles.resourcesNote}>{t("resources.note")}</p>
        </div>
      </section>

      {/* ── 9. INSIGHTS ───────────────────────────────────────────────── */}
      <section className={styles.insights} aria-labelledby="insights-title">
        {/* Large background Agadez cross for texture */}
        <AgadezCross
          className={styles.insightsCrossDecor}
          color="var(--mt-rust-soft)"
          opacity={0.04}
        />
        <div className={styles.insightsInner}>
          <p className={styles.eyebrowLight}>{t("insights.eyebrow")}</p>
          <h2 id="insights-title" className={styles.insightsHeading}>
            {t("insights.title")}
          </h2>
          <p className={styles.insightsBody}>{t("insights.body")}</p>
          <div className={styles.insightsActions}>
            <Link className={styles.primaryActionLarge} href="/partner">
              {t("insights.ctaPartner")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.ghostAction} href="/about">
              {t("insights.ctaAbout")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA BAND ────────────────────────────────────────── */}
      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.finalCtaShade} aria-hidden="true" />
        <div className={styles.finalCtaInner}>
          <p className={styles.eyebrowOnDark}>{t("finalCta.eyebrow")}</p>
          <h2 id="final-cta-title" className={styles.finalCtaHeading}>
            {t("finalCta.title")}
          </h2>
          <div className={styles.finalCtaActions}>
            <Link className={styles.primaryAction} href="/submit">
              {t("finalCta.ctaShare")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryAction} href="/stories">
              {t("finalCta.ctaExplore")}
            </Link>
          </div>
          <p className={styles.finalCtaNote}>
            <ShieldCheck aria-hidden="true" />
            {t("finalCta.safety")}
          </p>
        </div>
      </section>

      {/* ── 11. PATHWAYS NAV ──────────────────────────────────────────── */}
      <nav
        className={styles.pathways}
        aria-label={t("pathways.discover")}
      >
        <p className={styles.pathwaysLabel}>{t("pathways.discover")}</p>
        <ul className={styles.pathwaysList}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(t.raw("pathways.items") as any[]).map((item: any) => (
            <li key={String(item.href)}>
              <Link href={String(item.href)}>
                {String(item.label)}
                <ArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

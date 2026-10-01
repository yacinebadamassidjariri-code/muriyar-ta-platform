import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Landmark,
  Layers,
  Mic,
  PenLine,
  Play,
  ShieldCheck,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { localeLabels, type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import { listLatestEpisodes } from "@/lib/data/podcast";
import { listCategories } from "@/lib/data/resources";
import {
  isPublicResourceThemeCategory,
  publicResourceThemeCategoryName,
} from "@/components/resources/content";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { AgadezCross, AgadezDivider, AgadezMark } from "@/components/brand/agadez";
import styles from "@/components/home/full-home.module.css";

/**
 * Editorial photographs used to set the mood of story cards. They are
 * thematic, never portraits of contributors, and rotate by position.
 */
const STORY_PHOTOS = [
  "/editorial/writing-notebook.jpg",
  "/editorial/listening-writing.jpg",
  "/editorial/writing-bw.jpg",
  "/editorial/community-steps.jpg",
] as const;

const JOURNEY_ICONS = [PenLine, BookOpen, Mic, Layers, Landmark] as const;

type JourneyStep = { num: string; title: string; body: string };
type Pillar = { title: string; body: string };

function languageName(code: string): string {
  return localeLabels[code as Locale] ?? code.toUpperCase();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });

  // Public views only; every reader degrades to [] on error.
  const [stories, episodes, categories] = await Promise.all([
    listHomepageStories(3),
    listLatestEpisodes(locale, 3),
    listCategories(),
  ]);

  const themeCategories = categories
    .filter((c) => isPublicResourceThemeCategory(c.slug))
    .map((c) => ({ ...c, name: publicResourceThemeCategoryName(c.slug, c.name) }));

  const pillars = asArray<Pillar>(t.raw("name.pillars"));
  const journeySteps = asArray<JourneyStep>(t.raw("journey.steps"));
  const submitBullets = asArray<string>(t.raw("submitInvite.bullets"));
  const principles = asArray<string>(t.raw("insights.principles"));

  // Hero quote: a short excerpt from the newest real published story.
  const quoteStory = stories[0] ?? null;
  const [featured, ...moreStories] = stories;

  return (
    <div className={styles.page}>
      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <Image
          src="/editorial/community-steps.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <AgadezCross className={styles.heroCross} />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <AgadezMark className={styles.eyebrowMark} />
              {t("hero.eyebrow")}
            </p>
            <h1 id="home-hero-title" className={styles.heroTitle}>
              {t("hero.titleLine1")} {t("hero.titleLine2")}
            </h1>
            <p className={styles.heroEmphasis}>{t("hero.emphasis")}</p>
            <p className={styles.heroIntro}>{t("hero.intro")}</p>

            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/submit">
                {t("hero.ctaShareStory")}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryActionLight} href="/stories">
                {t("hero.ctaExploreStories")}
              </Link>
            </div>

            <p className={styles.heroReassurance}>
              <ShieldCheck aria-hidden="true" />
              {t("hero.reassurance")}
            </p>
          </div>

          {quoteStory ? (
            <figure className={styles.quoteCard}>
              <figcaption className={styles.quoteLabel}>
                {t("hero.quoteLabel")} · {languageName(quoteStory.language_code)}
              </figcaption>
              <blockquote
                className={styles.quoteText}
                lang={quoteStory.language_code}
              >
                “{deriveExcerpt(quoteStory.body_text, 150)}”
              </blockquote>
              <Link
                href={`/stories/${quoteStory.slug}`}
                className={styles.quoteLink}
              >
                <span className={styles.quoteTitle} lang={quoteStory.language_code}>
                  {quoteStory.title}
                </span>
                <span className={styles.quoteCta}>
                  {t("hero.quoteCta")} <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            </figure>
          ) : null}
        </div>
      </section>

      {/* ── 2. WHAT IS MURIYAR TA ────────────────────────────────── */}
      <section className={styles.name} aria-labelledby="name-title">
        <div className={styles.nameInner}>
          <AgadezDivider className={styles.divider} />
          <p className={styles.eyebrow}>{t("name.eyebrow")}</p>
          <h2 id="name-title" className={styles.nameHeading}>
            {t("name.titleLine1Start")}
            <em>{t("name.titleLine1Accent")}</em>
            {t("name.titleLine1End")} <span>{t("name.titleLine2")}</span>
          </h2>
          <p className={styles.nameBody}>{t("name.body")}</p>

          {pillars.length > 0 ? (
            <ul className={styles.pillars}>
              {pillars.map((p) => (
                <li key={p.title} className={styles.pillar}>
                  <AgadezMark className={styles.pillarMark} />
                  <h3 className={styles.pillarTitle}>{p.title}</h3>
                  <p className={styles.pillarBody}>{p.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ── 3. FEATURED STORIES ──────────────────────────────────── */}
      <section className={styles.stories} aria-labelledby="stories-title">
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{t("stories.eyebrow")}</p>
              <h2 id="stories-title" className={styles.sectionTitle}>
                {t("stories.titleStart")}
                <em>{t("stories.titleItalic")}</em>
              </h2>
            </div>
            <Link className={styles.textLink} href="/stories">
              {t("stories.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          {featured ? (
            <ul className={styles.storyGrid}>
              {[featured, ...moreStories].map((story, i) => (
                <li
                  key={story.story_id}
                  className={i === 0 ? styles.storyCardFeatured : styles.storyCard}
                >
                  <Image
                    src={STORY_PHOTOS[i % STORY_PHOTOS.length]}
                    alt=""
                    fill
                    sizes={
                      i === 0
                        ? "(max-width: 64rem) 100vw, 60vw"
                        : "(max-width: 64rem) 100vw, 35vw"
                    }
                    className={styles.storyPhoto}
                  />
                  <div className={styles.storyShade} aria-hidden="true" />
                  <article className={styles.storyBody} lang={story.language_code}>
                    <p className={styles.storyMeta}>
                      <abbr title={languageName(story.language_code)}>
                        {story.language_code.toUpperCase()}
                      </abbr>
                      {story.tags[0]?.name ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{story.tags[0].name}</span>
                        </>
                      ) : null}
                    </p>
                    <h3 className={styles.storyTitle}>
                      <Link
                        href={`/stories/${story.slug}`}
                        className={styles.storyLink}
                      >
                        {story.title}
                      </Link>
                    </h3>
                    <p className={styles.storyExcerpt}>
                      {story.seo_description ??
                        deriveExcerpt(story.body_text, i === 0 ? 220 : 140)}
                    </p>
                    <span className={styles.storyCta} aria-hidden="true">
                      {t("stories.readCta")} →
                    </span>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyPanel}>
              <AgadezMark className={styles.emptyMark} />
              <p>{t("stories.empty")}</p>
              <Link className={styles.textLink} href="/submit">
                {t("stories.emptyCta")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. YOU CAN TELL US WHAT YOU'VE LIVED ─────────────────── */}
      <section className={styles.invite} aria-labelledby="invite-title">
        <div className={styles.inviteInner}>
          <div>
            <p className={styles.eyebrow}>{t("submitInvite.eyebrow")}</p>
            <h2 id="invite-title" className={styles.sectionTitle}>
              {t("submitInvite.titleStart")}
              <em>{t("submitInvite.titleItalic")}</em>
            </h2>
            <p className={styles.inviteBody}>{t("submitInvite.body")}</p>
            <ul className={styles.inviteList}>
              {submitBullets.map((bullet) => (
                <li key={bullet}>
                  <AgadezMark className={styles.inviteBullet} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className={styles.invitePanel} aria-labelledby="invite-panel-title">
            <AgadezCross className={styles.invitePanelCross} />
            <p className={styles.eyebrowOnDark}>{t("submitInvite.cardEyebrow")}</p>
            <h3 id="invite-panel-title" className={styles.invitePanelTitle}>
              {t("submitInvite.cardTitle")}
            </h3>
            <p className={styles.invitePanelBody}>{t("submitInvite.cardBody")}</p>
            <Link className={styles.primaryAction} href="/submit">
              {t("submitInvite.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <p className={styles.invitePanelLanguages}>
              {t("submitInvite.cardLanguages")}
            </p>
            <p className={styles.invitePanelCrisis}>
              {t("submitInvite.crisisNote")}{" "}
              <Link href="/resources/crisis">{t("submitInvite.crisisLink")}</Link>
            </p>
          </aside>
        </div>
      </section>

      {/* ── 5. STORY JOURNEY ─────────────────────────────────────── */}
      <section className={styles.journey} aria-labelledby="journey-title">
        <div className={styles.shell}>
          <header className={styles.journeyHeader}>
            <AgadezDivider className={styles.dividerOnDark} />
            <p className={styles.eyebrowOnDark}>{t("journey.eyebrow")}</p>
            <h2 id="journey-title" className={styles.journeyTitle}>
              {t("journey.title")}
            </h2>
            <p className={styles.journeySubtitle}>{t("journey.subtitle")}</p>
          </header>

          <ol className={styles.journeySteps}>
            {journeySteps.map((step, i) => {
              const Icon = JOURNEY_ICONS[i % JOURNEY_ICONS.length];
              return (
                <li key={step.title} className={styles.journeyStep}>
                  <span className={styles.journeyIcon} aria-hidden="true">
                    <Icon strokeWidth={1.4} />
                  </span>
                  <span className={styles.journeyNum} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.journeyStepTitle}>{step.title}</h3>
                  <p className={styles.journeyStepBody}>{step.body}</p>
                </li>
              );
            })}
          </ol>
          <p className={styles.journeyNote}>{t("journey.note")}</p>
        </div>
      </section>

      {/* ── 6. PODCAST ───────────────────────────────────────────── */}
      <section className={styles.podcast} aria-labelledby="podcast-title">
        <div className={styles.podcastInner}>
          <div>
            <p className={styles.eyebrow}>
              <Play aria-hidden="true" className={styles.eyebrowIcon} />
              {t("podcast.eyebrow")}
            </p>
            <h2 id="podcast-title" className={styles.sectionTitle}>
              {t("podcast.titleLine1")} <em>{t("podcast.titleLine2")}</em>
            </h2>
            <p className={styles.podcastBody}>{t("podcast.body")}</p>
            <Link className={styles.textLink} href="/podcast">
              {t("podcast.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {episodes.length > 0 ? (
            <ol className={styles.episodeList} aria-label={t("podcast.episodesLabel")}>
              {episodes.map((ep, i) => (
                <li key={ep.episode_id} className={styles.episode}>
                  <span className={styles.episodeNum} aria-hidden="true">
                    {String(ep.episode_number ?? i + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.episodeInfo}>
                    <h3 className={styles.episodeTitle} lang={ep.language_code}>
                      <Link href={`/podcast/${ep.episode_id}`} className={styles.episodeLink}>
                        {ep.title}
                      </Link>
                    </h3>
                    <p className={styles.episodeMeta}>
                      {languageName(ep.language_code)}
                      {ep.duration_seconds ? (
                        <>
                          {" · "}
                          {Math.max(1, Math.round(ep.duration_seconds / 60))}{" "}
                          {t("podcast.minutesLabel")}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={styles.episodePlay} aria-hidden="true">
                    <Play />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.podcastSoon}>
              <span className={styles.podcastWave} aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
              <p className={styles.podcastSoonLabel}>{t("podcast.comingSoon")}</p>
              <p className={styles.podcastSoonBody}>{t("podcast.episodesComingSoon")}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. RESOURCES ─────────────────────────────────────────── */}
      <section className={styles.resources} aria-labelledby="resources-title">
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{t("resources.eyebrow")}</p>
              <h2 id="resources-title" className={styles.sectionTitle}>
                {t("resources.titleStart")}
                <em>{t("resources.titleItalic")}</em>
              </h2>
              <p className={styles.resourcesBody}>{t("resources.body")}</p>
            </div>
          </header>

          {themeCategories.length > 0 ? (
            <ul className={styles.resourceGrid} aria-label={t("resources.pillsLabel")}>
              {themeCategories.map((cat) => (
                <li key={cat.category_id}>
                  <Link
                    href={`/resources?category=${cat.category_id}`}
                    className={styles.resourceCard}
                  >
                    <AgadezMark className={styles.resourceMark} />
                    <span className={styles.resourceName}>{cat.name}</span>
                    <ArrowRight aria-hidden="true" className={styles.resourceArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.resourcesEmpty}>{t("resources.emptyBody")}</p>
          )}

          <Link className={styles.textLink} href="/resources">
            {t("resources.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── 8. INSIGHTS PREVIEW ──────────────────────────────────── */}
      <section className={styles.insights} aria-labelledby="insights-title">
        <div className={styles.insightsInner}>
          <div className={styles.insightsCopy}>
            <p className={styles.eyebrow}>{t("insights.eyebrow")}</p>
            <h2 id="insights-title" className={styles.sectionTitle}>
              {t("insights.titleStart")}
              <em>{t("insights.titleItalic")}</em>
            </h2>
            <p className={styles.insightsBody}>{t("insights.body")}</p>
            <p className={styles.insightsNote}>{t("insights.dataNote")}</p>
            <Link className={styles.textLink} href="/insights">
              {t("insights.ctaPartner")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {/* Concept preview of a future brief — deliberately contains no data. */}
          <div className={styles.brief}>
            <div className={styles.briefHeader}>
              <span className={styles.briefBrand}>
                <AgadezMark className={styles.briefMark} />
                Muriyar Ta
              </span>
              <span className={styles.briefStatus}>{t("insights.cardStatus")}</span>
            </div>
            <p className={styles.briefTitle}>{t("insights.cardLabel")}</p>
            <p className={styles.briefBody}>{t("insights.cardComingSoonBody")}</p>
            <ul className={styles.briefPrinciples}>
              {principles.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className={styles.briefRules} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA ─────────────────────────────────────────── */}
      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <Image
          src="/editorial/writing-bw.jpg"
          alt=""
          fill
          sizes="100vw"
          className={styles.finalPhoto}
        />
        <div className={styles.finalShade} aria-hidden="true" />
        <div className={styles.finalInner}>
          <AgadezDivider className={styles.dividerOnDark} />
          <h2 id="final-cta-title" className={styles.finalTitle}>
            {t("finalCta.titleStart")}
            <em>{t("finalCta.titleItalic")}</em>
          </h2>
          <p className={styles.finalBody}>{t("finalCta.body")}</p>
          <div className={styles.actionsCentered}>
            <Link className={styles.primaryAction} href="/submit">
              {t("finalCta.ctaShare")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryActionLight} href="/partner">
              {t("finalCta.ctaPartner")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

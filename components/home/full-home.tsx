import { ArrowRight, ShieldCheck, Check } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { FullHomeHeroMedia } from "@/components/home/full-home-hero-media";
import { AgadezCross, AgadezCrossSmall } from "@/components/home/agadez-cross";
import styles from "@/components/home/full-home.module.css";

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const stories = await listHomepageStories(3);

  // next-intl array access — @ts-expect-error suppressed per index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trustItems: string[] = (t.raw("trust.items") as any[]).map(String);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: { title: string; body: string }[] = (t.raw("how.steps") as any[]).map((s: any) => ({
    title: String(s.title),
    body: String(s.body),
  }));

  return (
    <div className={styles.page}>
      {/* ── 1. HERO ───────────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroMedia}>
          <FullHomeHeroMedia />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />

        {/* Agadez cross — decorative, top-right corner on desktop */}
        <AgadezCross
          className={styles.heroCrossDecor}
          color="var(--mt-rust-soft)"
          opacity={0.08}
        />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>{t("hero.eyebrow")}</p>
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
      </section>

      {/* ── 2. TRUST STRIP ────────────────────────────────────────────── */}
      <ul className={styles.trustStrip} aria-label={t("how.cta")}>
        {trustItems.map((item) => (
          <li key={item}>
            <Check aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      {/* ── 3. VOICES / STORIES ───────────────────────────────────────── */}
      <section className={styles.voices} aria-labelledby="voices-title">
        <header className={styles.voicesIntro}>
          <p className={styles.eyebrow}>{t("voices.eyebrow")}</p>
          <h2 id="voices-title" className={styles.displayHeading}>
            {t("voices.title")}
          </h2>
          <Link className={styles.textAction} href="/stories">
            {t("voices.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </header>

        {stories.length > 0 ? (
          <ol className={styles.storyList}>
            {stories.map((story) => (
              <li key={story.story_id}>
                <Link href={`/stories/${story.slug}`}>
                  {story.tags[0]?.name ? (
                    <span className={styles.storyTheme}>{story.tags[0].name}</span>
                  ) : null}
                  <blockquote>
                    &ldquo;{deriveExcerpt(story.body_text, 200)}&rdquo;
                  </blockquote>
                  <span className={styles.storyMeta}>
                    Anonymous · {story.language_code.toUpperCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.storyEmpty}>{t("voices.empty")}</p>
        )}
      </section>

      {/* ── 4. HOW IT WORKS ───────────────────────────────────────────── */}
      <section className={styles.process} aria-labelledby="process-title">
        <div className={styles.processInner}>
          <header className={styles.processIntro}>
            <p className={styles.eyebrowLight}>{t("how.eyebrow")}</p>
            <h2 id="process-title" className={styles.displayHeadingLight}>
              {t("how.title")}
            </h2>
            <Link className={styles.textActionLight} href="/submit">
              {t("how.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <ol className={styles.steps} aria-label={t("how.eyebrow")}>
            {steps.map(({ title, body }, index) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>{title}</h3>
                  <p className={styles.stepBody}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Agadez cross accent — lower-right */}
        <AgadezCross
          className={styles.processCrossDecor}
          color="var(--mt-rust-bright)"
          opacity={0.07}
        />
      </section>

      {/* ── 5. MISSION / WHY STORIES MATTER ──────────────────────────── */}
      <section className={styles.mission} aria-labelledby="mission-title">
        <div className={styles.missionContent}>
          <p className={styles.eyebrow}>{t("mission.eyebrow")}</p>
          <h2 id="mission-title" className={styles.displayHeading}>
            {t("mission.title")}
          </h2>
          <p className={styles.missionBody}>{t("mission.body")}</p>
          <Link className={styles.textAction} href="/about">
            {t("mission.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.missionAccent} aria-hidden="true">
          <AgadezCross
            className={styles.missionCrossDecor}
            color="var(--mt-sand)"
            opacity={0.15}
          />
        </div>
      </section>

      {/* ── 6. IMPACT PULL QUOTE ──────────────────────────────────────── */}
      <section className={styles.impact} aria-labelledby="impact-title">
        <div className={styles.impactInner}>
          <p className={styles.eyebrowLight}>{t("impact.eyebrow")}</p>
          <h2 id="impact-title" className={styles.impactHeading}>
            {t("impact.title")}
          </h2>
          <figure className={styles.impactQuote}>
            <blockquote>
              <p>&ldquo;{t("impact.pullQuote")}&rdquo;</p>
            </blockquote>
          </figure>
        </div>
      </section>

      {/* ── 7. NAME / MEANING ─────────────────────────────────────────── */}
      <section className={styles.nameSection} aria-labelledby="name-title">
        <div className={styles.nameContent}>
          <div className={styles.nameText}>
            <p className={styles.eyebrow}>{t("name.eyebrow")}</p>
            <h2 id="name-title" className={styles.displayHeading}>
              {t("name.title")}
            </h2>
            <p className={styles.nameBody}>{t("name.body")}</p>
          </div>
          <div className={styles.nameAccent} aria-hidden="true">
            <AgadezCrossSmall
              className={styles.nameCrossDecor}
              color="var(--mt-rust)"
              opacity={0.18}
            />
          </div>
        </div>
      </section>

      {/* ── 8. PODCAST TEASER ─────────────────────────────────────────── */}
      <section className={styles.podcast} aria-labelledby="podcast-title">
        <div className={styles.podcastContent}>
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
      </section>

      {/* ── 9. SUBMIT CTA BAND ────────────────────────────────────────── */}
      <section className={styles.submitBand} aria-labelledby="submit-title">
        <div className={styles.submitInner}>
          <p className={styles.eyebrowOnRed}>{t("submit.eyebrow")}</p>
          <h2 id="submit-title" className={styles.submitTitle}>
            {t("submit.title")}
          </h2>
          <p className={styles.submitBody}>{t("submit.body")}</p>
          <div className={styles.submitActions}>
            <Link className={styles.primaryActionLarge} href="/submit">
              {t("submit.cta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.submitSafetyNote}>
            <ShieldCheck aria-hidden="true" />
            {t("submit.safetyNote")}
          </p>
        </div>
      </section>

      {/* ── 10. PATHWAYS ──────────────────────────────────────────────── */}
      <nav className={styles.pathways} aria-label={t("pathways.discover")}>
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

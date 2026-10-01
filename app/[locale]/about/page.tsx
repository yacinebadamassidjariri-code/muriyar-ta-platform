import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import styles from "./about.module.css";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <main className={styles.page}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        {/* Editorial photography — thematic atmosphere, not biographical */}
        <div className={styles.heroPhoto} aria-hidden="true">
          <Image
            src="/editorial/community-steps.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>{t("heroEyebrow")}</p>
          <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
          <p className={styles.heroBody}>{t("heroBody")}</p>
        </div>
      </header>

      {/* ── PLATFORM ORIGIN ────────────────────────────────────────── */}
      <section className={styles.originSection} aria-labelledby="about-origin">
        <div className={styles.shell}>
          <div className={styles.twoCol}>
            <div className={styles.twoColLeft}>
              <p className={styles.eyebrow}>{t("storyEyebrow")}</p>
              <h2 id="about-origin" className={styles.sectionTitle}>{t("storyTitle")}</h2>
            </div>
            <div className={styles.twoColRight}>
              <p className={styles.prose}>{t("storyPara3")}</p>
              <p className={styles.prose}>{t("storyPara4")}</p>
              <p className={styles.prose}>{t("storyPara5")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ─────────────────────────────────────────────── */}
      <div className={styles.quoteSection} aria-hidden="false">
        <div className={styles.shell}>
          <blockquote className={styles.pullQuote}>
            <span className={styles.pullQuoteMark} aria-hidden="true">"</span>
            <p>{t("pullQuote")}</p>
          </blockquote>
        </div>
      </div>

      {/* ── ANONYMITY ──────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="about-anonymity">
        <div className={styles.shell}>
          <div className={styles.twoColAlt}>
            <div className={styles.twoColAltPhoto} aria-hidden="true">
              {/* Editorial photography — thematic, not biographical */}
              <div className={styles.photoFrame}>
                <Image
                  src="/editorial/writing-notebook.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover object-center"
                />
              </div>
            </div>
            <div className={styles.twoColAltCopy}>
              <p className={styles.eyebrow}>{t("anonymityEyebrow")}</p>
              <h2 id="about-anonymity" className={styles.sectionTitle}>{t("anonymityTitle")}</h2>
              <p className={styles.prose}>{t("anonymityPara1")}</p>
              <p className={styles.prose}>{t("anonymityPara2")}</p>
              <p className={styles.prose}>{t("anonymityPara3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION ─────────────────────────────────────────────────── */}
      <section className={styles.visionSection} aria-labelledby="about-vision">
        <div className={styles.shell}>
          <div className={styles.visionInner}>
            <p className={styles.eyebrowLight}>{t("missionVisionEyebrow")}</p>
            <h2 id="about-vision" className={styles.visionTitle}>{t("visionTitle")}</h2>
            <p className={styles.visionBody}>{t("visionBody")}</p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="about-pathway">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>{t("pathwayTitle")}</p>
          <h2 id="about-pathway" className={styles.sectionTitle}>{t("pathwayTitle")}</h2>
          <p className={styles.pathwayFlow}>{t("pathwaySteps")}</p>
          <p className={styles.prose}>{t("pathwayBody")}</p>
        </div>
      </section>

      {/* ── NAME MEANING ───────────────────────────────────────────── */}
      <section className={styles.nameSection} aria-labelledby="about-name">
        <div className={styles.shell}>
          <div className={styles.nameInner}>
            <p className={styles.eyebrow}>{t("nameEyebrow")}</p>
            <h2 id="about-name" className={styles.nameSectionTitle}>{t("nameTitle")}</h2>
            <p className={styles.prose}>{t("namePara1")}</p>
          </div>
        </div>
      </section>

      {/* ── FOUNDER ────────────────────────────────────────────────── */}
      <section className={styles.founderSection} aria-labelledby="about-founder">
        <div className={styles.shell}>
          <div className={styles.founderLayout}>
            <div className={styles.founderPortrait}>
              <div className={styles.founderFrame}>
                <Image
                  src="/editorial/founder-yacine.jpg"
                  alt="Yacine Badamassi Djariri, founder of Muriyar Ta"
                  fill
                  sizes="(max-width: 768px) 100vw, 36rem"
                  className="object-cover object-top"
                />
              </div>
              <p className={styles.founderCaption}>Yacine Badamassi Djariri</p>
            </div>
            <div className={styles.founderCopy}>
              <p className={styles.eyebrow}>{t("founderEyebrow")}</p>
              <h2 id="about-founder" className={styles.sectionTitle}>{t("founderTitle")}</h2>
              <p className={styles.prose}>{t("founderPara1")}</p>
              <p className={styles.prose}>{t("founderPara2")}</p>
              <p className={styles.founderQuote}>{t("founderPara3")}</p>
              <p className={styles.prose}>{t("founderPara4")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────── */}
      <section className={styles.ctaSection} aria-labelledby="about-cta">
        <div className={styles.shell}>
          <div className={styles.ctaInner}>
            <p className={styles.eyebrow}>{t("ctaEyebrow")}</p>
            <h2 id="about-cta" className={styles.ctaTitle}>{t("ctaTitle")}</h2>
            <p className={styles.ctaBody}>{t("ctaBody")}</p>
            <div className={styles.ctaActions}>
              <Link href="/submit" className={styles.ctaPrimary}>
                {t("ctaShareStory")}
              </Link>
              <Link href="/partner" className={styles.ctaSecondary}>
                {t("ctaPartnerWithUs")}
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

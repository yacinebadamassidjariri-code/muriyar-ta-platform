import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import styles from "./insights.module.css";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "insights" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "insights" });

  return (
    <main className={styles.page}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className={styles.headerSection}>
        <div className={styles.shell}>
          <div className={styles.headerInner}>
            <p className={styles.headerEyebrow}>{t("headerEyebrow")}</p>
            <h1 className={styles.headerTitle}>{t("headerTitle")}</h1>
            <p className={styles.headerBody}>{t("headerBody")}</p>
          </div>
        </div>
      </header>

      {/* ── THE MODEL ──────────────────────────────────────────── */}
      <section className={styles.modelSection} aria-labelledby="insights-model">
        <div className={styles.shell}>
          <div className={styles.twoCol}>
            <div className={styles.twoColLeft}>
              <p className={styles.eyebrow}>{t("modelEyebrow")}</p>
              <h2 id="insights-model" className={styles.sectionTitle}>{t("modelTitle")}</h2>
            </div>
            <div className={styles.twoColRight}>
              <p className={styles.prose}>{t("modelPara1")}</p>
              <p className={styles.prose}>{t("modelPara2")}</p>
              <p className={styles.prose}>{t("modelPara3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ─────────────────────────────────────────── */}
      <div className={styles.quoteSection} aria-hidden="false">
        <div className={styles.shell}>
          <blockquote className={styles.pullQuote}>
            <span className={styles.pullQuoteMark} aria-hidden="true">"</span>
            <p>{t("pullQuote")}</p>
          </blockquote>
        </div>
      </div>

      {/* ── THREE OFFERINGS ────────────────────────────────────── */}
      <section className={styles.offeringsSection} aria-labelledby="insights-offerings">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>{t("offeringsEyebrow")}</p>
          <h2 id="insights-offerings" className={styles.sectionTitle}>{t("offeringsTitle")}</h2>
          <p className={styles.offeringsNote}>{t("offeringsNote")}</p>
          <div className={styles.offeringsGrid}>

            <article className={styles.offeringCard}>
              <h3 className={styles.offeringTitle}>{t("offering1Title")}</h3>
              <p className={styles.offeringBody}>{t("offering1Body")}</p>
              <span className={styles.offeringStatus}>{t("offering1Status")}</span>
            </article>

            <article className={styles.offeringCard}>
              <h3 className={styles.offeringTitle}>{t("offering2Title")}</h3>
              <p className={styles.offeringBody}>{t("offering2Body")}</p>
              <span className={styles.offeringStatus}>{t("offering2Status")}</span>
            </article>

            <article className={styles.offeringCard}>
              <h3 className={styles.offeringTitle}>{t("offering3Title")}</h3>
              <p className={styles.offeringBody}>{t("offering3Body")}</p>
              <span className={styles.offeringStatus}>{t("offering3Status")}</span>
            </article>

          </div>
        </div>
      </section>

      {/* ── OUR COMMITMENT (INDIGO) ─────────────────────────────── */}
      <section className={styles.ethicsSection} aria-labelledby="insights-ethics">
        <div className={styles.shell}>
          <div className={styles.ethicsInner}>
            <p className={styles.eyebrowLight}>{t("ethicsEyebrow")}</p>
            <h2 id="insights-ethics" className={styles.ethicsTitle}>{t("ethicsTitle")}</h2>
            <p className={styles.ethicsBody}>{t("ethicsBody")}</p>
            <ul className={styles.ethicsList}>
              <li>{t("ethicsPoint1")}</li>
              <li>{t("ethicsPoint2")}</li>
              <li>{t("ethicsPoint3")}</li>
              <li>{t("ethicsPoint4")}</li>
              <li>{t("ethicsPoint5")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── WHO THIS IS FOR ────────────────────────────────────── */}
      <section className={styles.audienceSection} aria-labelledby="insights-audience">
        <div className={styles.shell}>
          <div className={styles.audienceInner}>
            <p className={styles.eyebrow}>{t("audienceEyebrow")}</p>
            <h2 id="insights-audience" className={styles.sectionTitle}>{t("audienceTitle")}</h2>
            <p className={styles.prose}>{t("audienceBody")}</p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section className={styles.ctaSection} aria-labelledby="insights-cta">
        <div className={styles.shell}>
          <div className={styles.ctaInner}>
            <p className={styles.eyebrow}>{t("ctaEyebrow")}</p>
            <h2 id="insights-cta" className={styles.ctaTitle}>{t("ctaTitle")}</h2>
            <p className={styles.ctaBody}>{t("ctaBody")}</p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.ctaPrimary}>
                {t("ctaContact")}
              </Link>
              <Link href="/partner" className={styles.ctaSecondary}>
                {t("ctaPartner")}
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

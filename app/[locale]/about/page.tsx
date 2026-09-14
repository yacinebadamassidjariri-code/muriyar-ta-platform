import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("metaDescription")}</p>
        </header>

        <section className={styles.section} aria-labelledby="about-platform">
          <h2 id="about-platform">{t("storyTitle")}</h2>
          <div className={styles.prose}>
            <p>{t("storyPara3")}</p>
            <p>{t("storyPara5")}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="about-anonymity">
          <h2 id="about-anonymity">{t("anonymityTitle")}</h2>
          <div className={styles.prose}>
            <p>{t("anonymityPara1")}</p>
            <p>{t("anonymityPara3")}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="about-advocacy">
          <h2 id="about-advocacy">{t("visionTitle")}</h2>
          <div className={styles.prose}><p>{t("visionBody")}</p></div>
        </section>

        <section className={styles.section} aria-labelledby="about-pathway">
          <h2 id="about-pathway">{t("pathwayTitle")}</h2>
          <div className={styles.prose}>
            <p className={styles.pathway}>{t("pathwaySteps")}</p>
            <p>{t("pathwayBody")}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="about-name">
          <h2 id="about-name">{t("nameTitle")}</h2>
          <div className={styles.prose}><p>{t("namePara1")}</p></div>
        </section>

        <section className={styles.section} aria-labelledby="about-founder">
          <h2 id="about-founder">{t("founderTitle")}</h2>
          <div className={styles.prose}>
            <p>{t("founderPara1")}</p>
            <p>{t("founderPara2")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

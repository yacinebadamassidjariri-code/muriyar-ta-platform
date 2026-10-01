import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import styles from "./partner.module.css";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partner" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const AUDIENCES = [
  "ngos",
  "researchers",
  "education",
  "donors",
  "media",
  "volunteers",
] as const;

const COLLABORATIONS = [
  "outreach",
  "research",
  "podcasts",
  "workshops",
  "advocacy",
  "resources",
  "translation",
  "grants",
] as const;

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "partner" });

  return (
    <main className={styles.page}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        {/* Editorial photography — community, institutional feel */}
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

      {/* ── WHY WE PARTNER ─────────────────────────────────────────── */}
      <section aria-labelledby="partner-why" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.twoCol}>
            <div>
              <p className={styles.eyebrow}>{t("whyEyebrow")}</p>
              <h2 id="partner-why" className={styles.sectionTitle}>{t("whyTitle")}</h2>
            </div>
            <div className={styles.proSeGroup}>
              <p className={styles.prose}>{t("whyPara1")}</p>
              <p className={styles.prose}>{t("whyPara2")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO WE WORK WITH ───────────────────────────────────────── */}
      <section aria-labelledby="partner-audiences" className={styles.audiencesSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t("audiencesEyebrow")}</p>
            <h2 id="partner-audiences" className={styles.sectionTitle}>{t("audiencesTitle")}</h2>
            <p className={styles.sectionSubtitle}>{t("audiencesDescription")}</p>
          </div>

          <ul className={styles.audienceGrid}>
            {AUDIENCES.map((key, index) => (
              <li key={key} className={styles.audienceItem}>
                <p className={styles.audienceNum}>{String(index + 1).padStart(2, "0")}</p>
                <h3 className={styles.audienceTitle}>{t(`audiences.${key}.title`)}</h3>
                <p className={styles.audienceBody}>{t(`audiences.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── HOW WE COLLABORATE ─────────────────────────────────────── */}
      <section aria-labelledby="partner-collaborations" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t("collaborationsEyebrow")}</p>
            <h2 id="partner-collaborations" className={styles.sectionTitle}>{t("collaborationsTitle")}</h2>
            <p className={styles.sectionSubtitle}>{t("collaborationsDescription")}</p>
          </div>

          <ul className={styles.collaborationList}>
            {COLLABORATIONS.map((key) => (
              <li key={key} className={styles.collaborationItem}>
                <h3 className={styles.collaborationTitle}>{t(`collaborations.${key}.title`)}</h3>
                <p className={styles.collaborationBody}>{t(`collaborations.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section aria-labelledby="partner-cta" className={styles.ctaSection}>
        <div className={styles.shell}>
          <div className={styles.ctaInner}>
            <div className={styles.ctaCopy}>
              <p className={styles.eyebrowLight}>{t("ctaEyebrow")}</p>
              <h2 id="partner-cta" className={styles.ctaTitle}>{t("ctaTitle")}</h2>
              <p className={styles.ctaBody}>{t("ctaBody")}</p>
            </div>
            <TrackedLink href="/contact" className={styles.ctaButton}
              eventType="partner_cta_click" entityType="cta" entityId="partner_page">
              {t("ctaPartnerWithUs")}
            </TrackedLink>
          </div>
        </div>
      </section>

    </main>
  );
}

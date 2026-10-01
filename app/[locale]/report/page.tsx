import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { ReportForm } from "@/components/report/report-form";
import styles from "./report.module.css";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "report" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "report" });

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* ── HERO ──────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSubtitle")}</p>
        </header>

        {/* ── NOTICE ────────────────────────────────────────────── */}
        <aside aria-labelledby="report-notice-heading" className={styles.notice}>
          <div className={styles.noticeInner}>
            <span aria-hidden="true" className={styles.noticeIcon}>
              <AlertCircle size={18} />
            </span>
            <div>
              <h2 id="report-notice-heading">{t("noticeTitle")}</h2>
              <ul>
                <li>{t("noticeNotEmergency")}</li>
                <li>{t("noticeCallEmergency")}</li>
                <li>{t("noticeModerationReview")}</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* ── REPORT FORM ───────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="report-form">
          <p className={styles.eyebrow}>{t("formEyebrow")}</p>
          <h2 id="report-form" className={styles.sectionTitle}>{t("formTitle")}</h2>
          <p className={styles.sectionDescription}>{t("formDescription")}</p>
          <div className={styles.sectionBody}>
            <ReportForm
              labels={{
                categoryLabel:       t("categoryLabel"),
                categoryPlaceholder: t("categoryPlaceholder"),
                categoryOptions: {
                  child_marriage: t("categoryOptions.child_marriage"),
                  gbv:            t("categoryOptions.gbv"),
                  education:      t("categoryOptions.education"),
                  trafficking:    t("categoryOptions.trafficking"),
                  harassment:     t("categoryOptions.harassment"),
                  mental_health:  t("categoryOptions.mental_health"),
                  other:          t("categoryOptions.other"),
                },
                descriptionLabel: t("descriptionLabel"),
                descriptionHelp:  t("descriptionHelp"),
                countryLabel:     t("countryLabel"),
                regionLabel:      t("regionLabel"),
                cityLabel:        t("cityLabel"),
                emailLabel:       t("emailLabel"),
                emailHelp:        t("emailHelp"),
                phoneLabel:       t("phoneLabel"),
                phoneHelp:        t("phoneHelp"),
                consentLabel:     t("consentLabel"),
                optionalHint:     t("optionalHint"),
                submitButton:     t("submitButton"),
                submittingLabel:  t("submittingLabel"),
                successTitle:     t("successTitle"),
                successBody:      t("successBody"),
                successAction:    t("successAction"),
                errors: {
                  categoryRequired:    t("errors.categoryRequired"),
                  descriptionRequired: t("errors.descriptionRequired"),
                  consentRequired:     t("errors.consentRequired"),
                  genericFailure:      t("errors.genericFailure"),
                },
              }}
            />
          </div>
        </section>

        {/* ── SUPPORT RESOURCES ─────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="report-support">
          <p className={styles.eyebrow}>{t("supportEyebrow")}</p>
          <h2 id="report-support" className={styles.sectionTitle}>{t("supportTitle")}</h2>
          <p className={styles.sectionDescription}>{t("supportDescription")}</p>
          <div className={styles.sectionBody}>
            <ul className={styles.supportList} style={{ listStyle: "none", margin: 0, padding: 0 }}>
              <li className={styles.supportItem}>
                <h3 className={styles.supportItemTitle}>{t("supportResourcesTitle")}</h3>
                <p className={styles.supportItemBody}>{t("supportResourcesBody")}</p>
                <div className={styles.supportAction}>
                  <Link href="/resources" className={styles.supportLink}>
                    {t("supportResourcesCta")} →
                  </Link>
                </div>
              </li>
              <li className={styles.supportItem}>
                <h3 className={styles.supportItemTitle}>{t("supportCrisisTitle")}</h3>
                <p className={styles.supportItemBody}>{t("supportCrisisBody")}</p>
                <div className={styles.supportAction}>
                  <Link href="/resources/crisis" className={styles.supportLink}>
                    {t("supportCrisisCta")} →
                  </Link>
                </div>
              </li>
            </ul>
          </div>
        </section>

      </div>
    </main>
  );
}

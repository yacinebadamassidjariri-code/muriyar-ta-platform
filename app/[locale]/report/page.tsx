import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertCircle, HeartHandshake, LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      {/* Hero */}
      <header className={styles.hero}>
        <p className={styles.eyebrow}>
          {t("heroEyebrow")}
        </p>
        <h1>
          {t("heroTitle")}
        </h1>
        <p>
          {t("heroSubtitle")}
        </p>
      </header>

      {/* Important Notice */}
      <aside
        aria-labelledby="report-notice-heading"
        className={styles.notice}
      >
        <div className={styles.noticeInner}>
          <span
            aria-hidden="true"
            className={styles.noticeIcon}
          >
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <h2
              id="report-notice-heading"
            >
              {t("noticeTitle")}
            </h2>
            <ul>
              <li>{t("noticeNotEmergency")}</li>
              <li>{t("noticeCallEmergency")}</li>
              <li>{t("noticeModerationReview")}</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Report Form */}
      <Section
        id="report-form"
        eyebrow={t("formEyebrow")}
        title={t("formTitle")}
        description={t("formDescription")}
        className={styles.section}
      >
        <ReportForm
          labels={{
            categoryLabel: t("categoryLabel"),
            categoryPlaceholder: t("categoryPlaceholder"),
            categoryOptions: {
              child_marriage: t("categoryOptions.child_marriage"),
              gbv: t("categoryOptions.gbv"),
              education: t("categoryOptions.education"),
              trafficking: t("categoryOptions.trafficking"),
              harassment: t("categoryOptions.harassment"),
              mental_health: t("categoryOptions.mental_health"),
              other: t("categoryOptions.other"),
            },
            descriptionLabel: t("descriptionLabel"),
            descriptionHelp: t("descriptionHelp"),
            countryLabel: t("countryLabel"),
            regionLabel: t("regionLabel"),
            cityLabel: t("cityLabel"),
            emailLabel: t("emailLabel"),
            emailHelp: t("emailHelp"),
            phoneLabel: t("phoneLabel"),
            phoneHelp: t("phoneHelp"),
            consentLabel: t("consentLabel"),
            optionalHint: t("optionalHint"),
            submitButton: t("submitButton"),
            submittingLabel: t("submittingLabel"),
            successTitle: t("successTitle"),
            successBody: t("successBody"),
            successAction: t("successAction"),
            errors: {
              categoryRequired: t("errors.categoryRequired"),
              descriptionRequired: t("errors.descriptionRequired"),
              consentRequired: t("errors.consentRequired"),
              genericFailure: t("errors.genericFailure"),
            },
          }}
        />
      </Section>

      {/* Need Immediate Support */}
      <Section
        id="report-support"
        eyebrow={t("supportEyebrow")}
        title={t("supportTitle")}
        description={t("supportDescription")}
        className={styles.section}
      >
        <div className={styles.supportList}>
          <Card className={styles.supportItem}>
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
            >
              <HeartHandshake className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-ink">
              {t("supportResourcesTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              {t("supportResourcesBody")}
            </p>
            <div className={styles.supportAction}>
              <Button asChild variant="secondary" className={styles.linkButton}>
                <Link href="/resources">{t("supportResourcesCta")}</Link>
              </Button>
            </div>
          </Card>
          <Card className={styles.supportItem}>
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger"
            >
              <LifeBuoy className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-ink">
              {t("supportCrisisTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              {t("supportCrisisBody")}
            </p>
            <div className={styles.supportAction}>
              <Button asChild className={styles.linkButton}>
                <Link href="/resources/crisis">{t("supportCrisisCta")}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertCircle, HeartHandshake, LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/components/report/report-form";

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
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      {/* Hero */}
      <header className="pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {t("heroEyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-display font-semibold leading-tight text-ink md:text-4xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t("heroSubtitle")}
        </p>
      </header>

      {/* Important Notice */}
      <aside
        aria-labelledby="report-notice-heading"
        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800"
          >
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <h2
              id="report-notice-heading"
              className="text-base font-semibold text-amber-900"
            >
              {t("noticeTitle")}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-amber-900">
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
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex h-full flex-col gap-3 p-6">
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
            <div className="mt-auto pt-2">
              <Button asChild variant="secondary">
                <Link href="/resources">{t("supportResourcesCta")}</Link>
              </Button>
            </div>
          </Card>
          <Card className="flex h-full flex-col gap-3 p-6">
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
            <div className="mt-auto pt-2">
              <Button asChild>
                <Link href="/resources/crisis">{t("supportCrisisCta")}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
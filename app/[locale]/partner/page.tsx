import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const PRINCIPLES = [
  "privacy",
  "ethics",
  "community",
  "respect",
  "collaboration",
  "evidence",
] as const;

const PRIORITIES = [
  "regional",
  "translation",
  "academic",
  "guests",
  "organizational",
  "funding",
] as const;

const PROCESS_STEPS = ["reach", "talk", "explore", "build"] as const;

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "partner" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-20">
      {/* Hero */}
      <header className="pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {t("heroEyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-display font-semibold leading-tight text-ink md:text-4xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t("heroBody")}
        </p>
      </header>

      {/* Why We Partner */}
      <Section
        id="partner-why"
        eyebrow={t("whyEyebrow")}
        title={t("whyTitle")}
      >
        <div className="max-w-2xl space-y-4 text-base leading-relaxed text-ink">
          <p>{t("whyPara1")}</p>
          <p>{t("whyPara2")}</p>
        </div>
      </Section>

      {/* Who We Work With */}
      <Section
        id="partner-audiences"
        eyebrow={t("audiencesEyebrow")}
        title={t("audiencesTitle")}
        description={t("audiencesDescription")}
      >
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {AUDIENCES.map((key) => (
            <li key={key}>
              <Card className="flex h-full flex-col gap-2 p-5">
                <h3 className="text-base font-semibold text-ink">
                  {t(`audiences.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {t(`audiences.${key}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Ways We Can Collaborate */}
      <Section
        id="partner-collaborations"
        eyebrow={t("collaborationsEyebrow")}
        title={t("collaborationsTitle")}
        description={t("collaborationsDescription")}
      >
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {COLLABORATIONS.map((key) => (
            <li key={key}>
              <Card className="flex h-full flex-col gap-2 p-5">
                <h3 className="text-base font-semibold text-ink">
                  {t(`collaborations.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {t(`collaborations.${key}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Our Principles — no descriptions per spec */}
      <Section
        id="partner-principles"
        eyebrow={t("principlesEyebrow")}
        title={t("principlesTitle")}
      >
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {PRINCIPLES.map((key) => (
            <li key={key}>
              <Card className="h-full p-5">
                <p className="text-base font-semibold text-ink">
                  {t(`principles.${key}`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Current Priorities */}
      <Section
        id="partner-priorities"
        eyebrow={t("prioritiesEyebrow")}
        title={t("prioritiesTitle")}
        description={t("prioritiesDescription")}
      >
        <Card className="p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {PRIORITIES.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 text-base text-ink"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                />
                <span>{t(`priorities.${key}`)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {/* Partnership Process */}
      <Section
        id="partner-process"
        eyebrow={t("processEyebrow")}
        title={t("processTitle")}
        description={t("processDescription")}
      >
        <ol className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-2">
          {PROCESS_STEPS.map((key, i) => (
            <li
              key={key}
              className="flex flex-col items-stretch gap-3 md:flex-1 md:flex-row md:items-center"
            >
              <Card className="flex h-full flex-1 flex-col gap-1 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {t("processStepLabel", { step: i + 1 })}
                </p>
                <h3 className="text-base font-semibold text-ink">
                  {t(`process.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {t(`process.${key}.body`)}
                </p>
              </Card>
              {i < PROCESS_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="self-center text-xl font-semibold text-brand-600 md:mx-1"
                >
                  <span className="md:hidden">↓</span>
                  <span className="hidden md:inline">→</span>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      {/* Closing CTA */}
      <Section
        id="partner-cta"
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        description={t("ctaBody")}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
<Link href="/partner">{t("ctaPartnerWithUs")}</Link>
</Button>
        </div>
      </Section>
    </div>
  );
}
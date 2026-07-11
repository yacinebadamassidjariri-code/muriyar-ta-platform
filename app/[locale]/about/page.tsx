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
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const VALUES = [
  "voice",
  "safety",
  "authenticity",
  "empowerment",
  "inclusion",
  "advocacy",
] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20">
      {/* Hero */}
      <header className="pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {t("heroEyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-display font-semibold leading-tight text-ink md:text-4xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          {t("heroBody")}
        </p>
      </header>

      {/* Our Story */}
      <Section
        id="about-story"
        eyebrow={t("storyEyebrow")}
        title={t("storyTitle")}
      >
        <div className="space-y-5 text-base leading-relaxed text-ink">
          <p>{t("storyPara1")}</p>
          <p>{t("storyPara2")}</p>
          <p>{t("storyPara3")}</p>
          <p className="font-semibold text-ink">{t("storyPara4")}</p>
          <p>{t("storyPara5")}</p>
        </div>
      </Section>

      {/* Why Anonymous Storytelling */}
      <Section
        id="about-anonymity"
        eyebrow={t("anonymityEyebrow")}
        title={t("anonymityTitle")}
      >
        <div className="space-y-5 text-base leading-relaxed text-ink">
          <p>{t("anonymityPara1")}</p>
          <p>{t("anonymityPara2")}</p>
          <p>{t("anonymityPara3")}</p>
        </div>
      </Section>

      {/* Mission + Vision */}
      <Section
        id="about-mission-vision"
        eyebrow={t("missionVisionEyebrow")}
        title={t("missionVisionTitle")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex h-full flex-col gap-3 p-6">
            <h3 className="text-lg font-semibold text-ink">
              {t("missionTitle")}
            </h3>
            <p className="text-base leading-relaxed text-ink-soft">
              {t("missionBody")}
            </p>
          </Card>
          <Card className="flex h-full flex-col gap-3 p-6">
            <h3 className="text-lg font-semibold text-ink">
              {t("visionTitle")}
            </h3>
            <p className="text-base leading-relaxed text-ink-soft">
              {t("visionBody")}
            </p>
          </Card>
        </div>
      </Section>

      {/* Our Values */}
      <Section
        id="about-values"
        eyebrow={t("valuesEyebrow")}
        title={t("valuesTitle")}
      >
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {VALUES.map((key) => (
            <li key={key}>
              <Card className="h-full p-5">
                <p className="text-base font-semibold text-ink">
                  {t(`values.${key}.title`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Why "Muriyar Ta"? */}
      <Section
        id="about-name"
        eyebrow={t("nameEyebrow")}
        title={t("nameTitle")}
      >
        <div className="space-y-5 text-base leading-relaxed text-ink">
          <p>{t("namePara1")}</p>
        </div>
      </Section>

      {/* Meet the Founder */}
      <Section
        id="about-founder"
        eyebrow={t("founderEyebrow")}
        title={t("founderTitle")}
      >
        <div className="space-y-5 text-base leading-relaxed text-ink">
          <p>{t("founderPara1")}</p>
          <p>{t("founderPara2")}</p>
          <p className="italic text-ink-soft">{t("founderPara3")}</p>
          <p>{t("founderPara4")}</p>
          <p>{t("founderPara5")}</p>
        </div>
      </Section>

      {/* Pull Quote */}
      <section
        aria-labelledby="about-pullquote"
        className="my-16 border-l-4 border-brand-600 bg-brand-50/40 py-8 pl-6 pr-4 md:pl-8"
      >
        <blockquote
          id="about-pullquote"
          className="font-display text-2xl font-medium leading-snug text-ink md:text-3xl"
        >
          {t("pullQuote")}
        </blockquote>
      </section>

      {/* Help Us Break the Silence */}
      <Section
        id="about-cta"
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        description={t("ctaBody")}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/submit">{t("ctaShareStory")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/resources">{t("ctaExploreResources")}</Link>
          </Button>
          <Button asChild variant="secondary">
  <Link href="/partner">{t("ctaPartnerWithUs")}</Link>
</Button>
        </div>
      </Section>
    </div>
  );
}
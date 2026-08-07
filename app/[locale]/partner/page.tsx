import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
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

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "partner" });

  return (
    <div className="w-full overflow-hidden bg-[#FCFAF7] text-charcoal-900">
      <header className="border-b border-rose-100 bg-[#F8F3EC]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.8fr)] lg:items-end lg:gap-20 lg:px-10 lg:py-24">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-plum-600 sm:text-xs">
              {t("heroEyebrow")}
            </p>
            <span
              aria-hidden="true"
              className="mt-4 block h-px w-12 bg-rose-300"
            />
            <h1 className="mt-7 max-w-3xl text-[clamp(3.5rem,8vw,6.75rem)] font-medium leading-[0.9] tracking-[-0.035em] text-plum-900 [font-family:var(--font-display),Georgia,serif]">
              {t("heroTitle")}
            </h1>
          </div>
          <p className="max-w-xl border-l border-rose-200 pl-6 text-lg leading-[1.75] text-charcoal-500 sm:pl-8 sm:text-xl">
            {t("heroBody")}
          </p>
        </div>
      </header>

      <div>
        <section
          id="partner-why"
          aria-labelledby="partner-why-heading"
          className="mx-auto grid w-full max-w-6xl gap-9 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)] lg:gap-20 lg:px-10 lg:py-24"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
              {t("whyEyebrow")}
            </p>
            <h2
              id="partner-why-heading"
              className="mt-4 text-[clamp(2.75rem,5vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.025em] text-plum-900 [font-family:var(--font-display),Georgia,serif]"
            >
              {t("whyTitle")}
            </h2>
          </div>
          <div className="space-y-6 border-t border-rose-200 pt-7 text-base leading-[1.8] text-charcoal-700 sm:text-lg lg:mt-1">
            <p>{t("whyPara1")}</p>
            <p>{t("whyPara2")}</p>
          </div>
        </section>

        <section
          id="partner-audiences"
          aria-labelledby="partner-audiences-heading"
          className="border-y border-rose-100 bg-[#FBF7F2]"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
            <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
                  {t("audiencesEyebrow")}
                </p>
                <h2
                  id="partner-audiences-heading"
                  className="mt-4 text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.025em] text-plum-900 [font-family:var(--font-display),Georgia,serif]"
                >
                  {t("audiencesTitle")}
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-[1.75] text-charcoal-500 sm:text-lg lg:pt-9">
                {t("audiencesDescription")}
              </p>
            </div>

            <ul className="mt-10 grid border-b border-rose-200 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
              {AUDIENCES.map((key, index) => (
                <li
                  key={key}
                  className="group border-t border-rose-200 py-6 sm:px-6 sm:nth-[2n+1]:pl-0 sm:nth-[2n]:pr-0 lg:px-7 lg:nth-[2n+1]:pl-7 lg:nth-[2n]:pr-7 lg:nth-[3n+1]:pl-0 lg:nth-[3n]:pr-0"
                >
                  <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-rose-500">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-plum-900 [font-family:var(--font-display),Georgia,serif]">
                    {t(`audiences.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-[1.7] text-charcoal-500">
                    {t(`audiences.${key}.body`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="partner-collaborations"
          aria-labelledby="partner-collaborations-heading"
          className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
              {t("collaborationsEyebrow")}
            </p>
            <h2
              id="partner-collaborations-heading"
              className="mt-4 text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.025em] text-plum-900 [font-family:var(--font-display),Georgia,serif]"
            >
              {t("collaborationsTitle")}
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-[1.75] text-charcoal-500 sm:text-lg">
              {t("collaborationsDescription")}
            </p>
          </div>

          <ul className="mt-10 grid gap-x-12 sm:grid-cols-2 lg:mt-14">
            {COLLABORATIONS.map((key) => (
              <li
                key={key}
                className="grid gap-3 border-t border-rose-200 py-6 sm:grid-cols-[minmax(9rem,0.75fr)_minmax(0,1.25fr)] sm:gap-7"
              >
                <h3 className="text-xl font-semibold leading-tight text-plum-900 [font-family:var(--font-display),Georgia,serif] sm:text-2xl">
                  {t(`collaborations.${key}.title`)}
                </h3>
                <p className="text-sm leading-[1.7] text-charcoal-500">
                  {t(`collaborations.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="partner-cta"
          aria-labelledby="partner-cta-heading"
          className="bg-[#2D2038] text-cream-50"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-9 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:px-10 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">
                {t("ctaEyebrow")}
              </p>
              <h2
                id="partner-cta-heading"
                className="mt-4 text-[clamp(2.6rem,5vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.025em] text-cream-50 [font-family:var(--font-display),Georgia,serif]"
              >
                {t("ctaTitle")}
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-[1.75] text-cream-50/75 sm:text-lg">
                {t("ctaBody")}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="min-h-12 w-fit bg-[#B96880] px-7 text-cream-50 hover:bg-[#A85670] focus-visible:outline-cream-50"
            >
              <Link href="/partner">{t("ctaPartnerWithUs")}</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

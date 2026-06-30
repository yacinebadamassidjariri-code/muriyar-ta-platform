import { getTranslations } from "next-intl/server";

/** Server component — short, calm introduction to the podcast section. */
export async function PodcastHero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  return (
    <header className="py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-ink md:text-4xl">
        {t("heroTitle")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        {t("heroBody")}
      </p>
    </header>
  );
}
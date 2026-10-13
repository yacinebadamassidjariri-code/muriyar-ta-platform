import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { listQaTopics, listPublishedQa } from "@/lib/data/qa";
import { BrowseList } from "@/components/ask/browse-list";
import styles from "@/components/ask/ask.module.css";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ask" });
  return {
    title: t("browse.meta.title"),
    description: t("browse.meta.description"),
  };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, topics, items] = await Promise.all([
    getTranslations({ locale, namespace: "ask" }),
    listQaTopics(locale),
    listPublishedQa({ limit: 100 }),
  ]);

  const browseCopy = {
    searchPlaceholder: t("browse.searchPlaceholder"),
    allTopics: t("browse.allTopics"),
    noResults: t("browse.noResults"),
    noResultsForSearch: t("browse.noResultsForSearch"),
    topicLabel: t("browse.topicLabel"),
    answeredBy: t("browse.answeredBy"),
  };

  return (
    <div className={styles.page}>
      {/* ── Hero ───────────────────────────────────────────── */}
      <header className={styles.browseHero}>
        <div className={styles.browseHeroInner}>
          <p className={styles.browseEyebrow}>{t("browse.eyebrow")}</p>
          <h1 className={styles.browseTitle}>
            {t("browse.title")}
          </h1>
          <p className={styles.browseDescription}>{t("browse.description")}</p>
          <p className={styles.browseAsk}>
            {t("browse.askYours")}{" "}
            <Link href="/ask" className={styles.browseAskLink}>
              {t("browse.askCtaLabel")}
            </Link>
          </p>
        </div>
      </header>

      {/* ── Filters + list (client component for interactivity) */}
      <BrowseList items={items} topics={topics} copy={browseCopy} />

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      {items.length === 0 ? null : (
        <section className={styles.browseCta}>
          <p className={styles.browseCtaTitle}>{t("browse.askYours")}</p>
          <Link href="/ask" className={styles.browseCtaLink}>
            {t("browse.askCtaLabel")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}

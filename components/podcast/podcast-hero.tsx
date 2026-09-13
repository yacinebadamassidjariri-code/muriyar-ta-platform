import { getTranslations } from "next-intl/server";
import styles from "./podcast.module.css";

export async function PodcastHero({ locale, purpose }: { locale: string; purpose: string }) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  return <header className={styles.hero}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("heroTitle")}</h1><p>{purpose}</p></header>;
}

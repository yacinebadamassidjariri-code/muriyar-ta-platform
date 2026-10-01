import { getTranslations } from "next-intl/server";
import Image from "next/image";
import styles from "./podcast.module.css";

export async function PodcastHero({ locale, purpose }: { locale: string; purpose: string }) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  return (
    <header className={styles.hero}>
      {/* Editorial atmosphere — woman listening and writing, thematic for podcast */}
      <div className={styles.heroPhoto} aria-hidden="true">
        <Image
          src="/editorial/listening-writing.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroInner}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
        <p className={styles.heroBody}>{purpose}</p>
      </div>
    </header>
  );
}

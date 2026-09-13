import { getTranslations } from "next-intl/server";
import type { PodcastTheme } from "@/lib/data/podcast";
import styles from "./podcast.module.css";
export async function PodcastThemeGrid({ themes, locale }: { themes: PodcastTheme[]; locale: string }) { const t = await getTranslations({ locale, namespace: "podcast" }); return <div className={styles.browseGroup}><h3>{t("themesTitle")}</h3>{themes.length ? <ul className={styles.browseList}>{themes.map((theme) => <li key={theme.tag_id}>{theme.name} <span className={styles.soon}>{t("comingSoon")}</span></li>)}</ul> : <p className={styles.relatedIntro}>{t("themesEmpty")}</p>}</div>; }

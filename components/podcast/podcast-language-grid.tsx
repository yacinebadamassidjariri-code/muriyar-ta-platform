import { getTranslations } from "next-intl/server";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";
import styles from "./podcast.module.css";
export async function PodcastLanguageGrid({ locale }: { locale: string }) { const t = await getTranslations({ locale, namespace: "podcast" }); return <div className={styles.browseGroup}><h3>{t("languagesTitle")}</h3><ul className={styles.browseList}>{(locales as readonly Locale[]).map((language) => <li key={language}>{localeLabels[language]} <span className={styles.soon}>{t("comingSoon")}</span></li>)}</ul></div>; }

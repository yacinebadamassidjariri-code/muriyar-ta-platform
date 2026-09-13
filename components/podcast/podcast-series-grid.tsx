import { getTranslations } from "next-intl/server";
import { getPodcastSeries } from "@/lib/content/podcast-series";
import styles from "./podcast.module.css";
export async function PodcastSeriesGrid({ locale }: { locale: string }) { const t = await getTranslations({ locale, namespace: "podcast" }); return <div className={styles.browseGroup}><h3>{t("seriesTitle")}</h3><ul className={styles.browseList}>{getPodcastSeries().map((series) => <li key={series.slug}>{t(`series.${series.slug}.name`)} <span className={styles.soon}>{t("comingSoon")}</span></li>)}</ul></div>; }

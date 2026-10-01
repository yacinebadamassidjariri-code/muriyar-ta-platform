import { setRequestLocale } from "next-intl/server";
import { type Locale } from "@/lib/i18n/routing";
import { submitCopy } from "@/components/submit/content";
import { StoryForm } from "@/components/submit/story-form";
import styles from "@/components/submit/submit.module.css";

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = submitCopy[locale as Locale] ?? submitCopy.en;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{copy.intro.eyebrow}</p>
        <h1>{copy.intro.title}</h1>
        <p className={styles.subtitle}>{copy.intro.subtitle}</p>
        <ul className={styles.assurances} aria-label={copy.intro.assurancesLabel}>
          {copy.intro.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </header>
      <StoryForm copy={copy} locale={locale} />
    </div>
  );
}

import { ArrowRight, BookOpen } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { listQaTopics } from "@/lib/data/qa";
import { QuestionForm } from "@/components/ask/question-form";
import styles from "@/components/ask/ask.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ask" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, topics] = await Promise.all([
    getTranslations({ locale, namespace: "ask" }),
    listQaTopics(locale),
  ]);

  const copy = {
    form: {
      eyebrow: t("form.eyebrow"),
      title: t("form.title"),
      help: t("form.help"),
      placeholder: t("form.placeholder"),
      charsSuffix: t("form.charsSuffix"),
      topicLabel: t("form.topicLabel"),
      topicDefault: t("form.topicDefault"),
      languageLabel: t("form.languageLabel"),
      consentLabel: t("form.consentLabel"),
      consentNote: t("form.consentNote"),
      submitButton: t("form.submitButton"),
      submitting: t("form.submitting"),
    },
    success: {
      eyebrow: t("success.eyebrow"),
      title: t("success.title"),
      body: t("success.body"),
      browseLink: t("success.browseLink"),
      askAnother: t("success.askAnother"),
    },
    errors: {
      too_short: t("errors.too_short"),
      too_long: t("errors.too_long"),
      consent_required: t("errors.consent_required"),
      rate_limited: t("errors.rate_limited"),
      submit_failed: t("errors.submit_failed"),
    },
  };

  return (
    <div className={styles.page}>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="ask-hero-title">
        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>{t("hero.eyebrow")}</p>
            <h1 id="ask-hero-title" className={styles.heroTitle}>
              {t("hero.title")}
            </h1>
            <p className={styles.heroDescription}>{t("hero.description")}</p>
            <div className={styles.heroActions}>
              <a href="#ask-form" className={styles.primaryAction}>
                {t("form.submitButton")}
                <ArrowRight aria-hidden="true" />
              </a>
              <Link href="/ask/browse" className={styles.secondaryAction}>
                <BookOpen aria-hidden="true" />
                {t("browse.eyebrow")}
              </Link>
            </div>
          </div>

          {/* Privacy + process cards */}
          <aside aria-labelledby="ask-privacy-heading">
            <div className={styles.infoPanel}>
              <h2 id="ask-privacy-heading" className={styles.infoPanelTitle}>
                {t("privacy.heading")}
              </h2>
              <ul className={styles.infoPanelList}>
                <li>{t("privacy.anonymous")}</li>
                <li>{t("privacy.noIp")}</li>
                <li>{t("privacy.moderation")}</li>
                <li>{t("privacy.published")}</li>
              </ul>
            </div>

            <div className={styles.infoPanel} style={{ marginTop: "1.25rem" }}>
              <h2 className={styles.infoPanelTitle}>
                {t("moderation.heading")}
              </h2>
              <ol className={styles.processSteps}>
                <li className={styles.processStep}>
                  <span className={styles.stepNum} aria-hidden="true" />
                  <div>
                    <h3 className={styles.stepTitle}>{t("moderation.step1Title")}</h3>
                    <p className={styles.stepBody}>{t("moderation.step1Body")}</p>
                  </div>
                </li>
                <li className={styles.processStep}>
                  <span className={styles.stepNum} aria-hidden="true" />
                  <div>
                    <h3 className={styles.stepTitle}>{t("moderation.step2Title")}</h3>
                    <p className={styles.stepBody}>{t("moderation.step2Body")}</p>
                  </div>
                </li>
                <li className={styles.processStep}>
                  <span className={styles.stepNum} aria-hidden="true" />
                  <div>
                    <h3 className={styles.stepTitle}>{t("moderation.step3Title")}</h3>
                    <p className={styles.stepBody}>{t("moderation.step3Body")}</p>
                  </div>
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Form ───────────────────────────────────────────── */}
      <section id="ask-form" className={styles.formSection}>
        <div className={styles.formInner}>
          <div className={styles.formIntro}>
            <p className={styles.formIntroEyebrow}>{t("form.eyebrow")}</p>
          </div>
          <QuestionForm topics={topics} locale={locale as Locale} copy={copy} />
        </div>
      </section>
    </div>
  );
}

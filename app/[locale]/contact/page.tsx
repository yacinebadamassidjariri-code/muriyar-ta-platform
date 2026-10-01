import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact/contact-form";
import styles from "./contact.module.css";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const CHANNELS = [
  { key: "general",      email: "hello@example.org" },
  { key: "partnerships", email: "partnerships@example.org" },
  { key: "media",        email: "media@example.org" },
  { key: "research",     email: "research@example.org" },
] as const;

const FAQ_KEYS = ["anonymity", "response_time", "partner", "research"] as const;

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("metaDescription")}</p>
        </header>

        {/* ── CONTACT FORM ──────────────────────────────────────── */}
        <section className={styles.formSection} aria-labelledby="contact-form">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
            <h2 id="contact-form">{t("formTitle")}</h2>
            <p>{t("formDescription")}</p>
          </div>
          <ContactForm labels={{
            nameLabel:            t("nameLabel"),
            emailLabel:           t("emailLabel"),
            organizationLabel:    t("organizationLabel"),
            organizationOptional: t("organizationOptional"),
            subjectLabel:         t("subjectLabel"),
            messageLabel:         t("messageLabel"),
            messageHelp:          t("messageHelp"),
            consentLabel:         t("consentLabel"),
            submitButton:         t("submitButton"),
            successTitle:         t("successTitle"),
            successBody:          t("successBody"),
            successAction:        t("successAction"),
            errors: {
              nameRequired:    t("errors.nameRequired"),
              emailRequired:   t("errors.emailRequired"),
              emailInvalid:    t("errors.emailInvalid"),
              subjectRequired: t("errors.subjectRequired"),
              messageRequired: t("errors.messageRequired"),
              consentRequired: t("errors.consentRequired"),
            },
          }} />
          <p className={styles.safetyNote}>{t("footerNote")}</p>
        </section>

        {/* ── CONTACT CHANNELS ──────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="contact-channels">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
            <h2 id="contact-channels">{t("channelsTitle")}</h2>
          </div>
          <ul className={styles.channelList}>
            {CHANNELS.map(({ key, email }) => (
              <li key={key}>
                <div>
                  <h3>{t(`channels.${key}.title`)}</h3>
                  <p>{t(`channels.${key}.body`)}</p>
                </div>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            ))}
          </ul>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="contact-faq">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t("heroEyebrow")}</p>
            <h2 id="contact-faq">{t("faqTitle")}</h2>
          </div>
          <div className={styles.faqList}>
            {FAQ_KEYS.map((key) => (
              <details key={key}>
                <summary>
                  <span>{t(`faq.${key}.q`)}</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{t(`faq.${key}.a`)}</p>
              </details>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

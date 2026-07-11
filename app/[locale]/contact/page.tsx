import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Handshake, Mail, Megaphone, Microscope } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/contact-form";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

type ContactChannel = {
  key: "general" | "partnerships" | "media" | "research";
  email: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const CHANNELS: ContactChannel[] = [
  { key: "general", email: "hello@example.org", Icon: Mail },
  { key: "partnerships", email: "partnerships@example.org", Icon: Handshake },
  { key: "media", email: "media@example.org", Icon: Megaphone },
  { key: "research", email: "research@example.org", Icon: Microscope },
];

const FAQ_KEYS = ["anonymity", "response_time", "partner", "research"] as const;

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      {/* Hero */}
      <header className="pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {t("heroEyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-display font-semibold leading-tight text-ink md:text-4xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t("heroDescription")}
        </p>
      </header>

      {/* Contact form */}
      <Section
        id="contact-form"
        eyebrow={t("formEyebrow")}
        title={t("formTitle")}
        description={t("formDescription")}
      >
        <ContactForm
          labels={{
            nameLabel: t("nameLabel"),
            emailLabel: t("emailLabel"),
            organizationLabel: t("organizationLabel"),
            organizationOptional: t("organizationOptional"),
            subjectLabel: t("subjectLabel"),
            messageLabel: t("messageLabel"),
            messageHelp: t("messageHelp"),
            consentLabel: t("consentLabel"),
            submitButton: t("submitButton"),
            successTitle: t("successTitle"),
            successBody: t("successBody"),
            successAction: t("successAction"),
            errors: {
              nameRequired: t("errors.nameRequired"),
              emailRequired: t("errors.emailRequired"),
              emailInvalid: t("errors.emailInvalid"),
              subjectRequired: t("errors.subjectRequired"),
              messageRequired: t("errors.messageRequired"),
              consentRequired: t("errors.consentRequired"),
            },
          }}
        />
      </Section>

      {/* Ways to reach us */}
      <Section
        id="contact-channels"
        eyebrow={t("channelsEyebrow")}
        title={t("channelsTitle")}
        description={t("channelsDescription")}
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map(({ key, email, Icon }) => (
            <li key={key}>
              <Card className="flex h-full flex-col gap-3 p-6">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-ink">
                  {t(`channels.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {t(`channels.${key}.body`)}
                </p>
                <p className="mt-auto pt-1 text-sm">
                  <a
                    href={`mailto:${email}`}
                    className="font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {email}
                  </a>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* FAQ */}
      <Section
        id="contact-faq"
        eyebrow={t("faqEyebrow")}
        title={t("faqTitle")}
        description={t("faqDescription")}
      >
        <Card className="divide-y divide-line p-2">
          {FAQ_KEYS.map((key) => (
            <details
              key={key}
              className="group open:bg-brand-50/40"
            >
              <summary
                className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-md px-3 py-3 text-sm font-semibold text-ink hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span>{t(`faq.${key}.q`)}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand-700 transition-transform group-open:rotate-45"
                >
                  {"+"}
                </span>
              </summary>
              <div className="px-3 pb-3 pt-1 text-sm leading-relaxed text-ink-soft">
                {t(`faq.${key}.a`)}
              </div>
            </details>
          ))}
        </Card>
      </Section>

      {/* Trust footer */}
      <p className="mt-10 max-w-2xl text-sm text-ink-soft">
        {t("footerNote")}
      </p>
    </div>
  );
}
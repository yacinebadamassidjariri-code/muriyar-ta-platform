import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Source_Sans_3, Lora } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { routing, localeDir, type Locale } from "@/lib/i18n/routing";
import { Providers } from "@/components/providers";
import { SkipLink } from "@/components/a11y/skip-link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PublicRouteChrome } from "@/components/layout/public-route-chrome";
import { RouteContent } from "@/components/layout/route-content";
import { OutreachTracker } from "@/components/analytics/outreach-tracker";
import "../globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans-stack",
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/**
 * Vercel Analytics privacy filter (ANA-01).
 *
 * Sensitive routes must never appear as analytics events:
 *   - /admin/**        — internal moderation panel
 *   - /auth/**         — OAuth callbacks and password-reset flows
 *   - /login           — sign-in page
 *   - /register        — account creation
 *   - /forgot-password — password-reset entry
 *   - /mfa             — MFA verification screen
 *   - /submit          — story submission form
 *   - /report          — incident-report form
 *
 * The app is localised: every route is prefixed with a locale segment
 * (e.g. /en/admin, /fr/submit). We strip the first path segment if it
 * matches a known locale before testing the sensitive-segment list.
 *
 * Returning `null` from beforeSend drops the event entirely; nothing is
 * sent to Vercel. Public pages (homepage, stories, podcast, resources,
 * insights, about, contact, partner) pass through unchanged.
 */
const KNOWN_LOCALES = new Set(["en", "fr", "ha", "zar"]);

/**
 * Top-level path segments (after an optional locale prefix) that must
 * be suppressed. Each entry matches the segment itself AND any nested
 * paths below it (e.g. "admin" blocks /en/admin/moderation/queue).
 */
const BLOCKED_SEGMENTS = new Set([
  "admin",
  "auth",
  "login",
  "register",
  "forgot-password",
  "mfa",
  "submit",
  "report",
]);

function filterAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const { pathname } = new URL(event.url);
    // Split into non-empty segments: "/en/admin/queue" → ["en", "admin", "queue"]
    const segments = pathname.split("/").filter(Boolean);
    // Strip the locale prefix if present so the check is locale-agnostic.
    const first = segments[0] ?? "";
    const topSegment = KNOWN_LOCALES.has(first) ? (segments[1] ?? "") : first;
    if (BLOCKED_SEGMENTS.has(topSegment)) return null;
  } catch {
    // Malformed URL — allow through; the event URL is Vercel's own value.
  }
  return event;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    metadataBase: process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
      : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enable static rendering for this locale.
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeDir[locale as Locale];

  return (
    <html
  lang={locale}
  dir={dir}
  className={`${sourceSans.variable} ${lora.variable}`}
  suppressHydrationWarning
>
      <body className="flex min-h-dvh flex-col bg-surface font-sans text-ink antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <OutreachTracker />
            <PublicRouteChrome>
              <SkipLink />
              <Header />
            </PublicRouteChrome>
            <RouteContent>{children}</RouteContent>
            <PublicRouteChrome>
              <Footer />
            </PublicRouteChrome>
          </Providers>
        </NextIntlClientProvider>
        <Analytics beforeSend={filterAnalyticsEvent} />
      </body>
    </html>
  );
}

import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fr", "ha", "zar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ha: "Hausa",
  zar: "Zarma",
};

// All supported languages are written left-to-right. Driven by
// supported_languages.is_rtl in the database for future locales.
export const localeDir: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  fr: "ltr",
  ha: "ltr",
  zar: "ltr",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries a locale prefix (/en, /fr, /ha, /zar).
  localePrefix: "always",
});

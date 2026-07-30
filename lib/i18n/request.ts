import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

function isMessages(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withEnglishFallback(
  fallback: Messages,
  localized: Messages,
): Messages {
  const messages: Messages = { ...fallback };

  for (const [key, value] of Object.entries(localized)) {
    messages[key] =
      isMessages(value) && isMessages(fallback[key])
        ? withEnglishFallback(fallback[key], value)
        : value;
  }

  return messages;
}

// Loads the message catalog for the active request locale.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const english = (await import("../../messages/en.json")).default as Messages;
  const localized = (await import(`../../messages/${locale}.json`))
    .default as Messages;

  return { locale, messages: withEnglishFallback(english, localized) };
});

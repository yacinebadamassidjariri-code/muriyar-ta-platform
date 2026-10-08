"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

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

export function AnalyticsProvider() {
  return <Analytics beforeSend={filterAnalyticsEvent} />;
}

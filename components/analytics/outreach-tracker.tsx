"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { recordEvent } from "@/lib/actions/record-event";

/**
 * Fires a single `outreach_visit` event when the page loads with a recognised
 * UTM campaign or source parameter.
 *
 * Mounted once in the root locale layout so it covers every landing page —
 * the homepage, /submit, /about, /resources, and any other entry point.
 *
 * Privacy rules:
 * - Only broad channel/campaign slugs are accepted (e.g. 'impacther_whatsapp',
 *   'linkedin', 'qr_event'). utm_content, utm_term, and utm_medium are ignored.
 * - Values containing '@', shaped like a UUID, containing spaces, or longer
 *   than 60 characters are rejected before the RPC call. The DB-level
 *   record_event() function provides a second rejection layer.
 * - No cookie, sessionStorage, localStorage, or persistent identifier is set.
 *   Next.js re-renders this component on client-side navigation, but the ref
 *   guard `fired` persists for the lifetime of the React tree, so the event
 *   fires at most once per full page load — not on soft navigations.
 */

/** Params checked in priority order. utm_campaign is more specific than utm_source. */
const UTM_PRIORITY = ["utm_campaign", "utm_source"] as const;

const SLUG_RE = /^[a-z0-9_-]{1,60}$/;

function extractSlug(params: URLSearchParams): string | null {
  for (const key of UTM_PRIORITY) {
    const raw = params.get(key);
    if (!raw) continue;
    const slug = raw.toLowerCase().trim();
    // Allowlist: only slugs that are lowercase alphanumeric + underscore/hyphen,
    // max 60 chars. This rejects UUIDs, email addresses, spaces, and freeform text.
    if (!SLUG_RE.test(slug)) continue;
    return slug;
  }
  return null;
}

export function OutreachTracker() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const slug = extractSlug(searchParams);
    if (!slug) return;
    fired.current = true;
    void recordEvent("outreach_visit", "channel", slug);
  }, []); // empty deps: run once on mount, never on re-render or navigation

  return null;
}

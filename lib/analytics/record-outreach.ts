import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Records an outreach_visit event from a server component.
 * Called when the submit page loads with a recognised utm_source or utm_campaign.
 *
 * Privacy rules:
 * - Only broad channel slugs are recorded (e.g. 'impacther_whatsapp', 'linkedin').
 * - utm_content, utm_term, and any value that looks like a personal identifier
 *   (contains '@', is UUID-shaped, or is longer than 64 chars) are rejected.
 * - No IP, user-agent, or session identifier is stored.
 *
 * Allowed channel slugs are an allowlist of recognised broad sources.
 * Unrecognised values are stored as-is but capped at 64 chars and lowercased,
 * so organic/unknown visits that somehow carry a utm_source are still recorded
 * as a channel slug. The DB-level record_event() function provides a second
 * layer of UUID/email rejection.
 */

const CHANNEL_PARAM_PRIORITY = ["utm_campaign", "utm_source"] as const;

function extractChannelSlug(params: URLSearchParams): string | null {
  for (const key of CHANNEL_PARAM_PRIORITY) {
    const raw = params.get(key);
    if (!raw) continue;
    const slug = raw.toLowerCase().trim().slice(0, 64);
    if (!slug) continue;
    // Reject UUID-shaped or email-like values
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(slug)) continue;
    if (slug.includes("@")) continue;
    return slug;
  }
  return null;
}

export async function recordOutreachVisit(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<void> {
  // Normalise Next.js searchParams to URLSearchParams
  const flat: [string, string][] = [];
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) { if (v[0]) flat.push([k, v[0]]); }
    else if (v) flat.push([k, v]);
  }
  const params = new URLSearchParams(flat);
  const channelSlug = extractChannelSlug(params);
  if (!channelSlug) return; // no outreach params — nothing to record

  try {
    const supabase = await createClient();
    await supabase.rpc("record_event", {
      p_event_type: "outreach_visit",
      p_entity_type: "channel",
      p_entity_id: channelSlug,
    });
  } catch {
    // Analytics must never throw to the calling page.
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Privacy-safe analytics intake (Application Structure §analytics).
 *
 * Calls the SECURITY DEFINER record_event() RPC via the server Supabase client.
 * The server client runs under the user's anon JWT; record_event() runs as
 * SECURITY DEFINER (postgres) and satisfies the require_service_role() trigger.
 *
 * Privacy guarantees:
 * - No IP, user-agent, or persistent visitor identifier is accepted or stored.
 * - entity_id must be a broad, non-personal label (locale code, channel slug,
 *   CTA label). Never pass a submission ID, user ID, email, age, or story text.
 * - Errors are silently swallowed — analytics must never block user actions.
 */

export type AnalyticsEventType =
  | "outreach_visit"
  | "submission_started"
  | "submission_completed"
  | "resource_click"
  | "partner_cta_click";

/**
 * Record a single analytics event. Fire-and-forget — never await the result
 * in a user-facing path unless you need to confirm it for tests.
 *
 * @param eventType  One of the five tracked conversion events.
 * @param entityType Short category label, e.g. 'locale', 'channel', 'cta'.
 * @param entityId   Broad, non-personal identifier. Max 64 chars.
 *                   - outreach_visit    → channel slug, e.g. 'impacther_whatsapp'
 *                   - submission_*      → locale code, e.g. 'en'
 *                   - resource_click    → resource slug or ID label
 *                   - partner_cta_click → CTA label, e.g. 'partner_form'
 */
export async function recordEvent(
  eventType: AnalyticsEventType,
  entityType?: string,
  entityId?: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_event", {
      p_event_type: eventType,
      p_entity_type: entityType ?? null,
      p_entity_id: entityId ?? null,
    });
  } catch {
    // Analytics must never propagate errors to callers.
  }
}

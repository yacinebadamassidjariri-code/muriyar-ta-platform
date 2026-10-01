"use client";

import { type ComponentProps } from "react";
import { Link } from "@/lib/i18n/navigation";
import { recordEvent, type AnalyticsEventType } from "@/lib/actions/record-event";

type Props = ComponentProps<typeof Link> & {
  /** Analytics event type to fire on click. */
  eventType: AnalyticsEventType;
  /** Broad, non-personal entity_type label, e.g. 'cta'. */
  entityType?: string;
  /** Broad, non-personal entity_id label, e.g. 'partner_form'. */
  entityId?: string;
};

/**
 * Drop-in replacement for <Link> that fires a single analytics event on click.
 * Event recording is fire-and-forget and never blocks navigation.
 */
export function TrackedLink({ eventType, entityType, entityId, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        void recordEvent(eventType, entityType, entityId);
        onClick?.(e);
      }}
    />
  );
}

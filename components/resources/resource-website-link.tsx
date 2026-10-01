"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordEvent } from "@/lib/actions/record-event";

/**
 * The "Visit website" button for a resource card.
 * Records a resource_click analytics event (fire-and-forget) on click.
 *
 * entity_type = 'resource_category'
 * entity_id   = broad category slug derived from the public categoryLabel
 *               (e.g. 'legal_aid', 'mental_health', 'crisis', 'uncategorised')
 *
 * The resource name, URL, and resource ID are never passed to analytics.
 */
export function ResourceWebsiteLink({
  href,
  categoryLabel,
  isCrisis,
  label,
}: {
  href: string;
  /** Public category label already shown on the card, e.g. "Legal Aid". */
  categoryLabel?: string;
  /** True for crisis-flagged resources — maps to the 'crisis' slug. */
  isCrisis?: boolean;
  label: string;
}) {
  // Derive a broad, non-sensitive slug: prefer crisis flag, then category, then fallback.
  const slug = isCrisis
    ? "crisis"
    : categoryLabel
      ? categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)
      : "uncategorised";

  return (
    <Button asChild variant="secondary" size="sm">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void recordEvent("resource_click", "resource_category", slug)}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

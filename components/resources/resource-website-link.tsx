"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordEvent } from "@/lib/actions/record-event";

/**
 * The "Visit website" button for a resource card.
 * Records a resource_click analytics event (fire-and-forget) on click.
 * entity_id is the resource_id (a UUID), but record_event() rejects UUIDs —
 * so we pass a safe slug-form: the resource name, lowercased and truncated.
 */
export function ResourceWebsiteLink({
  href,
  resourceName,
  label,
}: {
  href: string;
  resourceName: string;
  label: string;
}) {
  const slug = resourceName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);

  return (
    <Button asChild variant="secondary" size="sm">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void recordEvent("resource_click", "resource", slug)}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

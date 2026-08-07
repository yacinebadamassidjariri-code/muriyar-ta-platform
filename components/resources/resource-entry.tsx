import { cn } from "@/lib/utils/cn";
import type { Resource } from "@/lib/data/resources";

export type ResourceEntryLabels = {
  visit: string;
  localTag: string;
};

function editorialDescription(description: string): string {
  return description
    .replace(/(?:^|\s)(?:Focus|Services|Notes):\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One organization, typography-first — no card, no icon stack. The name leads,
 * a concise description invites, and a single quiet text line carries the
 * trust-building metadata (region and, when present, supported languages). A
 * restrained "Visit →" is the only action. Local organizations wear a quiet
 * "In Niger" tag so nearby support stands out in any section.
 */
export function ResourceEntry({
  resource,
  regionLabel,
  isLocal = false,
  categoryLabels = [],
  labels,
}: {
  resource: Resource;
  regionLabel?: string;
  isLocal?: boolean;
  categoryLabels?: string[];
  labels: ResourceEntryLabels;
}) {
  const langs =
    Array.isArray(resource.languages_supported) &&
    resource.languages_supported.length > 0
      ? resource.languages_supported.join(" · ")
      : null;
  // For local entries the "In Niger" tag already carries the region, so it is
  // omitted from the metadata line to avoid repeating it.
  const meta = [...categoryLabels, isLocal ? null : regionLabel, langs]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="grid gap-5 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10 sm:py-8">
      <div className="min-w-0">
        {isLocal ? (
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-plum-600">
            {labels.localTag}
          </p>
        ) : null}
        <h3
          className={cn(
            "font-display text-2xl font-medium leading-tight text-plum-900 sm:text-[1.7rem]",
            isLocal && "mt-1",
          )}
        >
          {resource.name}
        </h3>

        {resource.description ? (
          <p className="mt-3 max-w-3xl leading-[1.7] text-charcoal-500">
            {editorialDescription(resource.description)}
          </p>
        ) : null}

        {meta ? (
          <p className="mt-3 text-xs leading-relaxed tracking-[0.08em] text-stone-500">
            {meta}
          </p>
        ) : null}
      </div>

      {resource.contact_phone || resource.contact_email ? (
        <div className="flex min-w-0 flex-col items-start gap-2 text-sm text-charcoal-500 sm:items-end sm:text-right">
          {resource.contact_phone ? (
            <a
              href={`tel:${resource.contact_phone}`}
              className="break-all transition-colors hover:text-plum-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
            >
              {resource.contact_phone}
            </a>
          ) : null}
          {resource.contact_email ? (
            <a
              href={`mailto:${resource.contact_email}`}
              className="break-all transition-colors hover:text-plum-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
            >
              {resource.contact_email}
            </a>
          ) : null}
          {resource.website_url ? (
            <a
              href={resource.website_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${labels.visit}: ${resource.name}`}
              className="mt-1 inline-flex items-center gap-1.5 border-b border-rose-300 pb-1 text-sm font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
            >
              {labels.visit}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      ) : resource.website_url ? (
        <a
          href={resource.website_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${labels.visit}: ${resource.name}`}
          className="inline-flex h-fit w-fit items-center gap-1.5 border-b border-rose-300 pb-1 text-sm font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600 sm:justify-self-end"
        >
          {labels.visit}
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </article>
  );
}

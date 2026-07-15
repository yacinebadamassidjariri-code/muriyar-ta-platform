import { cn } from "@/lib/utils/cn";
import type { Resource } from "@/lib/data/resources";

export type ResourceEntryLabels = {
  visit: string;
  localTag: string;
};

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
  labels,
}: {
  resource: Resource;
  regionLabel?: string;
  isLocal?: boolean;
  labels: ResourceEntryLabels;
}) {
  const langs =
    Array.isArray(resource.languages_supported) &&
    resource.languages_supported.length > 0
      ? resource.languages_supported.join(" · ")
      : null;
  // For local entries the "In Niger" tag already carries the region, so it is
  // omitted from the metadata line to avoid repeating it.
  const meta = [isLocal ? null : regionLabel, langs].filter(Boolean).join(" · ");

  return (
    <article className="py-6">
      {isLocal ? (
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-plum-600">
          {labels.localTag}
        </p>
      ) : null}
      <h3
        className={cn(
          "font-display text-xl font-medium leading-snug text-plum-800",
          isLocal && "mt-1",
        )}
      >
        {resource.name}
      </h3>

      {resource.description ? (
        <p className="mt-2 leading-relaxed text-charcoal-500">
          {resource.description}
        </p>
      ) : null}

      {meta ? (
        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-stone-500">
          {meta}
        </p>
      ) : null}

      {resource.contact_phone || resource.contact_email ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-500">
          {resource.contact_phone ? (
            <a
              href={`tel:${resource.contact_phone}`}
              className="transition-colors hover:text-plum-700"
            >
              {resource.contact_phone}
            </a>
          ) : null}
          {resource.contact_email ? (
            <a
              href={`mailto:${resource.contact_email}`}
              className="transition-colors hover:text-plum-700"
            >
              {resource.contact_email}
            </a>
          ) : null}
        </div>
      ) : null}

      {resource.website_url ? (
        <a
          href={resource.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium uppercase tracking-[0.14em] text-plum-700 transition-colors hover:text-plum-900"
        >
          {labels.visit}
          <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </article>
  );
}

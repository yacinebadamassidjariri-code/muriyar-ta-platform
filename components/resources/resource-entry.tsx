import type { Resource } from "@/lib/data/resources";
import styles from "./resources.module.css";

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
    <article className={styles.entry}>
      <div>
        {isLocal ? <p className={styles.localTag}>{labels.localTag}</p> : null}
        <h3 className={styles.entryTitle}>{resource.name}</h3>

        {resource.description ? (
          <p className={styles.entryDescription}>
            {editorialDescription(resource.description)}
          </p>
        ) : null}

        {meta ? <p className={styles.metadata}>{meta}</p> : null}
      </div>

      {resource.contact_phone || resource.contact_email ? (
        <div className={styles.entryActions}>
          {resource.contact_phone ? (
            <a
              href={`tel:${resource.contact_phone}`}
              className={styles.contactLink}
            >
              {resource.contact_phone}
            </a>
          ) : null}
          {resource.contact_email ? (
            <a
              href={`mailto:${resource.contact_email}`}
              className={styles.contactLink}
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
              className={styles.visitLink}
            >
              {labels.visit}
            </a>
          ) : null}
        </div>
      ) : resource.website_url ? (
        <a
          href={resource.website_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${labels.visit}: ${resource.name}`}
          className={styles.visitLink}
        >
          {labels.visit}
        </a>
      ) : null}
    </article>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResourceEntry, type ResourceEntryLabels } from "./resource-entry";
import styles from "./resources.module.css";

const INITIAL_VISIBLE_COUNT = 5;

export type SectionEntry = {
  resourceId: string;
  regionLabel?: string;
  isLocal: boolean;
  categoryLabels: string[];
  // The resource itself is passed through untouched.
  resource: import("@/lib/data/resources").Resource;
};

/**
 * One editorial "need" section: a serif heading, a short introductory paragraph
 * that guides rather than labels, then hairline-separated organizations. In
 * longer sections a small, gently set-apart "if you're not sure where to begin"
 * grouping surfaces a few curated organizations first, to ease decision fatigue.
 */
export function ResourceSection({
  id,
  label,
  intro,
  recommended,
  rest,
  recommendedHint,
  entryLabels,
  showMoreLabel,
  showLessLabel,
}: {
  id: string;
  label: string;
  intro: string;
  recommended: SectionEntry[];
  rest: SectionEntry[];
  recommendedHint: string;
  entryLabels: ResourceEntryLabels;
  showMoreLabel: string;
  showLessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = recommended.length + rest.length;
  const visibleRecommended = expanded
    ? recommended
    : recommended.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingSlots = Math.max(
    0,
    INITIAL_VISIBLE_COUNT - visibleRecommended.length,
  );
  const visibleRest = expanded ? rest : rest.slice(0, remainingSlots);
  const canExpand = total > INITIAL_VISIBLE_COUNT;

  return (
    <section
      aria-labelledby={id}
      className={styles.cluster}
    >
      <div className={styles.clusterHeader}>
        <h2 id={id} className={styles.clusterTitle}>
          {label}
        </h2>
        <p className={styles.clusterIntro}>{intro}</p>
      </div>

      <div id={`${id}-resources`}>
        {visibleRecommended.length > 0 ? (
          <div className={styles.recommendedGroup}>
            <p className={styles.recommendedLabel}>
              {recommendedHint}
            </p>
            <div className={styles.entryGroup}>
              {visibleRecommended.map((e) => (
                <ResourceEntry
                  key={e.resourceId}
                  resource={e.resource}
                  regionLabel={e.regionLabel}
                  isLocal={e.isLocal}
                  categoryLabels={e.categoryLabels}
                  labels={entryLabels}
                />
              ))}
            </div>
          </div>
        ) : null}

        {visibleRest.length > 0 ? (
          <div
            className={cn(
              styles.entryGroup,
              visibleRecommended.length > 0 && styles.recommendedGroup,
            )}
          >
            {visibleRest.map((e) => (
              <ResourceEntry
                key={e.resourceId}
                resource={e.resource}
                regionLabel={e.regionLabel}
                isLocal={e.isLocal}
                categoryLabels={e.categoryLabels}
                labels={entryLabels}
              />
            ))}
          </div>
        ) : null}
      </div>

      {canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-resources`}
          onClick={() => setExpanded((value) => !value)}
          className={styles.showButton}
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      ) : null}
    </section>
  );
}

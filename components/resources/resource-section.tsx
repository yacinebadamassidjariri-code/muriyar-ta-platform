"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResourceEntry, type ResourceEntryLabels } from "./resource-entry";

const INITIAL_VISIBLE_COUNT = 5;

export type SectionEntry = {
  resourceId: string;
  regionLabel?: string;
  isLocal: boolean;
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
    <section aria-labelledby={id} className="mt-14">
      <h2
        id={id}
        className="font-display text-2xl font-medium text-plum-800"
      >
        {label}
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-charcoal-500">{intro}</p>

      <div id={`${id}-resources`}>
        {visibleRecommended.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-plum-600">
              {recommendedHint}
            </p>
            <div className="mt-1 divide-y divide-stone-200/60 border-t border-stone-200/60">
              {visibleRecommended.map((e) => (
                <ResourceEntry
                  key={e.resourceId}
                  resource={e.resource}
                  regionLabel={e.regionLabel}
                  isLocal={e.isLocal}
                  labels={entryLabels}
                />
              ))}
            </div>
          </div>
        ) : null}

        {visibleRest.length > 0 ? (
          <div
            className={cn(
              "divide-y divide-stone-200/60 border-t border-stone-200/60",
              visibleRecommended.length > 0 ? "mt-8" : "mt-6",
            )}
          >
            {visibleRest.map((e) => (
              <ResourceEntry
                key={e.resourceId}
                resource={e.resource}
                regionLabel={e.regionLabel}
                isLocal={e.isLocal}
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
          className="mt-4 text-sm font-medium uppercase tracking-[0.14em] text-plum-700 transition-colors hover:text-plum-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      ) : null}
    </section>
  );
}

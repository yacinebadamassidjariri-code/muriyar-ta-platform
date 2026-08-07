"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResourceEntry, type ResourceEntryLabels } from "./resource-entry";

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
      className="mt-14 border-t border-stone-200 pt-10 md:mt-16 md:pt-12"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)] md:gap-12">
        <h2
          id={id}
          className="font-display text-3xl font-medium leading-tight text-plum-900 md:text-4xl"
        >
          {label}
        </h2>
        <p className="max-w-2xl leading-[1.7] text-charcoal-500">{intro}</p>
      </div>

      <div id={`${id}-resources`}>
        {visibleRecommended.length > 0 ? (
          <div className="mt-8">
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
              "divide-y divide-stone-200/60 border-t border-stone-200/60",
              visibleRecommended.length > 0 ? "mt-9" : "mt-8",
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
          className="mt-5 border-b border-rose-300 pb-1 text-sm font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      ) : null}
    </section>
  );
}

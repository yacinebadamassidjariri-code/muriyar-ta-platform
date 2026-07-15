import { cn } from "@/lib/utils/cn";
import { ResourceEntry, type ResourceEntryLabels } from "./resource-entry";

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
}: {
  id: string;
  label: string;
  intro: string;
  recommended: SectionEntry[];
  rest: SectionEntry[];
  recommendedHint: string;
  entryLabels: ResourceEntryLabels;
}) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2
        id={id}
        className="font-display text-2xl font-medium text-plum-800"
      >
        {label}
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-charcoal-500">{intro}</p>

      {recommended.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-plum-600">
            {recommendedHint}
          </p>
          <div className="mt-1 divide-y divide-stone-200/60 border-t border-stone-200/60">
            {recommended.map((e) => (
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

      <div
        className={cn(
          "divide-y divide-stone-200/60 border-t border-stone-200/60",
          recommended.length > 0 ? "mt-8" : "mt-6",
        )}
      >
        {rest.map((e) => (
          <ResourceEntry
            key={e.resourceId}
            resource={e.resource}
            regionLabel={e.regionLabel}
            isLocal={e.isLocal}
            labels={entryLabels}
          />
        ))}
      </div>
    </section>
  );
}

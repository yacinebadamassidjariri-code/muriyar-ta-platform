import { Section } from "@/components/ui/section";
import { StoryCard } from "@/components/stories/story-card";
import type { StoryListItem } from "@/lib/data/stories";

type Labels = {
  eyebrow: string;
  heading: string;
  description: string;
};

/**
 * Cross-content section: "Read the anonymous story" / "Stories behind this
 * episode." Usable from Podcast pages, future Research, future Campaigns.
 *
 * Hides entirely when stories is empty. Reuses StoryCard so the visual
 * language and locale-aware links to /stories/[slug] stay consistent.
 */
export function RelatedStorySection({
  stories,
  locale,
  labels,
}: {
  stories: StoryListItem[];
  locale: string;
  labels: Labels;
}) {
  if (stories.length === 0) return null;

  return (
    <Section
      id="related-stories"
      eyebrow={labels.eyebrow}
      title={labels.heading}
      description={labels.description}
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => (
          <li key={s.story_id}>
            <StoryCard story={s} locale={locale} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
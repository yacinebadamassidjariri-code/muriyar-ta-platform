import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import type { RelatedStory } from "@/lib/data/podcast";

type Labels = {
  eyebrow: string;
  heading: string;
  description: string;
  cta: string;
};

/**
 * Dedicated, full-width section explaining that the episode is inspired by
 * an anonymous story. NOT a small related-content card. Hides when no link
 * exists or the linked story is not currently published (it then wouldn't
 * appear in published_stories_public).
 */
export function PodcastRelatedStory({
  stories,
  labels,
}: {
  stories: RelatedStory[];
  labels: Labels;
}) {
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="related-story-heading" className="mt-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
        {labels.eyebrow}
      </p>
      <h2
        id="related-story-heading"
        className="mt-3 text-2xl font-bold text-ink md:text-3xl"
      >
        {labels.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-ink-soft">{labels.description}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {stories.map((s) => {
          const excerpt =
            s.seo_description?.trim() || deriveExcerpt(s.body_text);
          return (
            <Card key={s.story_id} className="flex h-full flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-ink-soft">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {labels.eyebrow}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
              <p className="line-clamp-4 text-sm leading-relaxed text-ink-soft">
                {excerpt}
              </p>
              <div className="mt-auto pt-2">
                <Button asChild>
                  <Link href={`/stories/${s.slug}`}>
                    {labels.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { StoryMeta } from "./story-meta";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import type { StoryListItem } from "@/lib/data/stories";

export function StoryCard({ story, locale }: { story: StoryListItem; locale: string }) {
  const excerpt = story.seo_description?.trim() || deriveExcerpt(story.body_text);

  return (
    <Card className="group h-full transition hover:border-brand-300 hover:shadow-md">
      <Link
        href={`/stories/${story.slug}`}
        className="flex h-full flex-col gap-3 rounded-xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <h3 className="text-lg font-semibold text-ink group-hover:text-brand-700">
          {story.title}
        </h3>
        <p className="line-clamp-3 text-sm text-ink-soft">{excerpt}</p>
        <div className="mt-auto pt-2">
          <StoryMeta publishedAt={story.published_at} tags={story.tags} locale={locale} />
        </div>
      </Link>
    </Card>
  );
}
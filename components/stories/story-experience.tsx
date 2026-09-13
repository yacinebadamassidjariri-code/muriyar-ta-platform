import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { StoryDetail, StoryListItem } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { StoriesEmptyState } from "@/components/stories/empty-state";
import type { StoriesEditorial } from "@/components/stories/content";
import styles from "@/components/stories/stories.module.css";

type ArchiveLabels = StoriesEditorial & { title: string; subtitle: string };
type DetailLabels = {
  back: string;
  moreStories: string;
  shareStory: string;
  attribution: string | null;
};

function formatDate(publishedAt: string, locale: string): string {
  const intlLocale = locale === "zar" ? "en" : locale;
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "long" }).format(
    new Date(publishedAt),
  );
}

export function hasPublicAttribution(author: string | null | undefined): boolean {
  const normalized = author?.trim().toLocaleLowerCase();
  return Boolean(
    normalized &&
    !["anonymous", "anonyme", "unknown", "not provided", "n/a"].includes(normalized),
  );
}

export function StoriesArchiveView({
  stories,
  labels,
}: {
  stories: StoryListItem[];
  labels: ArchiveLabels;
}) {
  return (
    <div className={styles.archive}>
      <div className={styles.archiveInner}>
        <header className={styles.archiveHeader}>
          <p className={styles.eyebrow}>{labels.heroEyebrow}</p>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
        </header>

        {stories.length === 0 ? (
          <StoriesEmptyState
            title={labels.emptyTitle}
            body={labels.emptyBody}
            ctaLabel={labels.emptyCta}
          />
        ) : (
          <ol className={styles.storyList}>
            {stories.map((story) => {
              const excerpt = story.seo_description?.trim() || deriveExcerpt(story.body_text, 175);
              const theme = story.tags[0]?.name;
              return (
                <li key={story.story_id}>
                  <Link className={styles.storyLink} href={`/stories/${story.slug}`}>
                    <div>
                      {theme ? <p className={styles.storyTheme}>{theme}</p> : null}
                      <h2 className={styles.storyTitle}>{story.title}</h2>
                    </div>
                    <p className={styles.storyExcerpt}>{excerpt}</p>
                    <span className={styles.readLabel}>{labels.readStory}<ArrowRight aria-hidden="true" /></span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function StoryDetailView({
  story,
  locale,
  labels,
}: {
  story: StoryDetail;
  locale: string;
  labels: DetailLabels;
}) {
  const theme = story.tags[0]?.name;
  return (
    <article className={styles.detail}>
      <div className={styles.detailInner}>
        <Link className={styles.backLink} href="/stories"><ArrowLeft aria-hidden="true" />{labels.back}</Link>
        <header className={styles.detailHeader}>
          <p className={styles.detailMeta}>
            <span><time dateTime={new Date(story.published_at).toISOString()}>{formatDate(story.published_at, locale)}</time></span>
            {theme ? <span>{theme}</span> : null}
          </p>
          <h1>{story.title}</h1>
          {labels.attribution ? <p className={styles.attribution}>{labels.attribution}</p> : null}
        </header>
        <div className={styles.storyBody}>{story.body_text}</div>
        <nav className={styles.endLinks} aria-label={labels.moreStories}>
          <Link href="/stories">{labels.moreStories}<ArrowRight aria-hidden="true" /></Link>
          <Link href="/submit">{labels.shareStory}<ArrowRight aria-hidden="true" /></Link>
        </nav>
      </div>
    </article>
  );
}

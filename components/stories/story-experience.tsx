import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import type { StoryDetail, StoryListItem } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { StoriesEmptyState } from "@/components/stories/empty-state";
import type { StoriesEditorial } from "@/components/stories/content";
import { getEditorialPhoto } from "@/components/stories/content";
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

      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <header className={styles.archiveHero}>
        <div className={styles.archiveHeroInner}>
          <p className={styles.heroEyebrow}>{labels.heroEyebrow}</p>
          <h1 className={styles.heroTitle}>
            <span>{labels.heroTitleLine1}</span>
            <em>{labels.heroTitleLine2}</em>
          </h1>
        </div>
      </header>

      {/* ── STORY GRID ──────────────────────────────────────────── */}
      <div className={styles.archiveGrid}>
        {stories.length === 0 ? (
          <StoriesEmptyState
            title={labels.emptyTitle}
            body={labels.emptyBody}
            ctaLabel={labels.emptyCta}
          />
        ) : (
          <ol className={styles.cardGrid}>
            {stories.map((story, index) => {
              const excerpt = story.seo_description?.trim() || deriveExcerpt(story.body_text, 175);
              const category = story.tags[0]?.name;
              const photo = getEditorialPhoto(index);
              return (
                <li key={story.story_id} className={styles.cardItem}>
                  <Link className={styles.card} href={`/stories/${story.slug}`}>

                    {/* IMAGE */}
                    <div className={styles.cardImageWrap} aria-hidden="true">
                      <Image
                        src={photo}
                        alt=""
                        fill
                        sizes="(max-width: 44rem) 100vw, (max-width: 68rem) 50vw, 33vw"
                        className={styles.cardImg}
                      />
                      <div className={styles.cardImageShade} />
                      {category ? (
                        <span className={styles.cardCategory}>{category}</span>
                      ) : null}
                    </div>

                    {/* CONTENT PANEL */}
                    <div className={styles.cardContent}>
                      <h2 className={styles.cardTitle}>{story.title}</h2>
                      {excerpt ? (
                        <p className={styles.cardExcerpt}>{excerpt}</p>
                      ) : null}

                      {/* FOOTER */}
                      <div className={styles.cardFooter}>
                        <span className={styles.cardMeta}>
                          {story.language_code?.toUpperCase()}
                        </span>
                        <span className={styles.cardCta}>
                          {labels.readStoryArrow}
                        </span>
                      </div>
                    </div>

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

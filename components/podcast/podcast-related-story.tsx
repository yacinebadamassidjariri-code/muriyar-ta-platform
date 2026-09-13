import { Link } from "@/lib/i18n/navigation";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import type { RelatedStory } from "@/lib/data/podcast";
import styles from "./podcast.module.css";
type Labels = { eyebrow: string; heading: string; description: string; cta: string };
export function PodcastRelatedStory({ stories, labels }: { stories: RelatedStory[]; labels: Labels }) {
  if (!stories.length) return null;
  return <section aria-labelledby="related-story-heading" className={`${styles.related} ${styles.reading}`}><p className={styles.eyebrow}>{labels.eyebrow}</p><h2 id="related-story-heading">{labels.heading}</h2><p className={styles.relatedIntro}>{labels.description}</p><ul className={styles.relatedList}>{stories.map((story) => <li key={story.story_id} className={styles.relatedItem}><div><h3>{story.title}</h3><p>{story.seo_description?.trim() || deriveExcerpt(story.body_text, 130)}</p></div><Link href={`/stories/${story.slug}`} className={`${styles.textLink} ${styles.relatedAction}`}>{labels.cta}</Link></li>)}</ul></section>;
}

import type { RelatedResource } from "@/lib/data/podcast";
import styles from "./podcast.module.css";
type Labels = { eyebrow: string; heading: string; description: string; visit: string };
export function PodcastRelatedResources({ resources, labels }: { resources: RelatedResource[]; labels: Labels }) {
  if (!resources.length) return null;
  return <section id="podcast-related-resources" aria-labelledby="related-resources-heading" className={`${styles.related} ${styles.reading}`}><p className={styles.eyebrow}>{labels.eyebrow}</p><h2 id="related-resources-heading">{labels.heading}</h2><p className={styles.relatedIntro}>{labels.description}</p><ul className={styles.relatedList}>{resources.map((resource) => <li key={resource.resource_id} className={styles.relatedItem}><div><h3>{resource.name}</h3>{resource.description ? <p>{resource.description}</p> : null}{resource.contact_phone ? <a className={styles.phone} href={`tel:${resource.contact_phone}`}>{resource.contact_phone}</a> : null}</div>{resource.website_url ? <a className={`${styles.textLink} ${styles.relatedAction}`} href={resource.website_url} target="_blank" rel="noopener noreferrer">{labels.visit}</a> : null}</li>)}</ul></section>;
}

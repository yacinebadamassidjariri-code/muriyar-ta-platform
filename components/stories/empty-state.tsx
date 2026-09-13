import { Link } from "@/lib/i18n/navigation";
import styles from "@/components/stories/stories.module.css";

export function StoriesEmptyState({ title, body, ctaLabel }: { title: string; body: string; ctaLabel: string }) {
  return (
    <section className={styles.emptyState} aria-labelledby="stories-empty-title">
      <h2 id="stories-empty-title">{title}</h2>
      <p>{body}</p>
      <Link className={styles.emptyAction} href="/submit">{ctaLabel}</Link>
    </section>
  );
}

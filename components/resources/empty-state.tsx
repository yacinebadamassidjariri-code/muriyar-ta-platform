export function ResourcesEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}
import styles from "./resources.module.css";

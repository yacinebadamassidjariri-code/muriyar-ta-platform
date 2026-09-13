import styles from "./podcast.module.css";
export function PodcastEmptyState({ title, body }: { title: string; body: string }) { return <section className={styles.empty}><h2>{title}</h2><p>{body}</p></section>; }

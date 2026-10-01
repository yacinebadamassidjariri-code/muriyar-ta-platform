import { Link } from "@/lib/i18n/navigation";
import styles from "./resources.module.css";

/**
 * A calm but clearly distinct pointer to crisis support.
 * Rendered as a deep-indigo editorial panel — warm and inviting,
 * not a red alert banner. The CTA uses a ghost-button treatment
 * that works on the dark background.
 */
export function CrisisCallout({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: string;
}) {
  return (
    <aside className={styles.crisisCallout}>
      <div>
        <h2>{heading}</h2>
        <p>{body}</p>
      </div>
      <Link href="/resources/crisis" className={styles.crisisCta}>
        {cta}
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}

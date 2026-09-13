import { Link } from "@/lib/i18n/navigation";
import styles from "./resources.module.css";

/**
 * A calm but clearly distinct pointer to crisis support, in the platform's rose
 * crisis idiom — a warm outlined block, not a red alert banner. Communicates
 * urgency through placement and the rose accent while staying editorial.
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
        <div>
          <h2>
            {heading}
          </h2>
          <p>{body}</p>
        </div>
        <Link
          href="/resources/crisis"
          className={styles.textLink}
        >
          {cta}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}

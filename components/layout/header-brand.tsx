import { Link } from "@/lib/i18n/navigation";
import { AgadezMark } from "@/components/brand/agadez";
import styles from "./header.module.css";

/**
 * Typographic Muriyar Ta lockup: serif wordmark with a small "Her voice"
 * subline. `tagline` is localized by the caller.
 */
export function HeaderBrand({ tagline }: { tagline: string }) {
  return (
    <Link href="/" className={styles.brand}>
      <AgadezMark className={styles.brandMark} />
      <span className={styles.brandText}>
        <span className={styles.brandName}>Muriyar Ta</span>
        <span className={styles.brandTagline}>{tagline}</span>
      </span>
    </Link>
  );
}

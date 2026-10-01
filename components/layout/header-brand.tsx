import { Link } from "@/lib/i18n/navigation";
import { MuriyarTaMark } from "@/components/brand/agadez";
import styles from "./header.module.css";

/**
 * Official Muriyar Ta brand lockup: icon mark + serif wordmark + tagline.
 * `tagline` is localized by the caller.
 */
export function HeaderBrand({ tagline }: { tagline: string }) {
  return (
    <Link href="/" className={styles.brand}>
      <MuriyarTaMark className={styles.brandMark} />
      <span className={styles.brandText}>
        <span className={styles.brandName}>Muriyar Ta</span>
        <span className={styles.brandTagline}>{tagline}</span>
      </span>
    </Link>
  );
}

import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import styles from "./header.module.css";

/**
 * Official Muriyar Ta brand lockup: approved logo PNG + tagline.
 * The PNG contains both the icon mark and the "Muriyar Ta" wordmark.
 * `tagline` is localized by the caller.
 */
export function HeaderBrand({ tagline }: { tagline: string }) {
  return (
    <Link href="/" className={styles.brand}>
      <Image
        src="/muriyar-ta-logo.png"
        alt="Muriyar Ta"
        height={36}
        width={144}
        className={styles.brandLogo}
        style={{ objectFit: "contain", objectPosition: "left center" }}
        priority
      />
      <span className={styles.brandTagline}>{tagline}</span>
    </Link>
  );
}

"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { locales, localeLabels } from "@/lib/i18n/routing";
import styles from "./footer.module.css";

/** Language links that keep the reader on the current page. */
export function FooterLanguages() {
  const current = useLocale();
  const pathname = usePathname();
  const params = useParams();

  return (
    <ul className={styles.list}>
      {locales.map((l) => (
        <li key={l}>
          <Link
            // Same pathname + dynamic params, different locale.
            href={{ pathname, params } as never}
            locale={l}
            lang={l}
            aria-current={l === current ? "true" : undefined}
            className={styles.link}
          >
            {localeLabels[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

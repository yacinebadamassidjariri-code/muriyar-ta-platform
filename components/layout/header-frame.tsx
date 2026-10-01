import type { ReactNode } from "react";
import styles from "./header.module.css";

/** Canonical ivory masthead frame shared by every public route. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  return (
    <header className={styles.masthead}>
      <div className={styles.mastheadInner}>{children}</div>
    </header>
  );
}

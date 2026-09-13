import { Search } from "lucide-react";
import styles from "./resources.module.css";

/**
 * Non-JS, SSR-friendly search. Submits a GET to the same route, preserving the
 * active category via a hidden field. Works without client JavaScript.
 */
export function SearchBar({
  label,
  placeholder,
  submitLabel,
  defaultValue,
  activeCategoryId = null,
  action,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  activeCategoryId?: number | null;
  action: string; // e.g. "/en/resources"
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={styles.searchForm}
    >
      <label htmlFor="resources-q" className="sr-only">
        {label}
      </label>
      <div className={styles.searchField}>
        <Search
          className={styles.searchIcon}
          aria-hidden="true"
        />
        <input
          id="resources-q"
          name="q"
          type="search"
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className={styles.searchInput}
        />
      </div>
      {activeCategoryId !== null ? (
        <input type="hidden" name="category" value={String(activeCategoryId)} />
      ) : null}
      <button
        type="submit"
        className={styles.searchButton}
      >
        {submitLabel}
      </button>
    </form>
  );
}

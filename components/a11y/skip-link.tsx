import { useTranslations } from "next-intl";

// First focusable element on the page; jumps keyboard/screen-reader users to <main>.
export function SkipLink() {
  const t = useTranslations("a11y");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-[var(--mt-slate)] focus:px-4 focus:py-2 focus:text-[var(--mt-text-on-dark)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--mt-rust-bright)]"
    >
      {t("skipToContent")}
    </a>
  );
}

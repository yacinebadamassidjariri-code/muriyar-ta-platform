import { useTranslations } from "next-intl";

// First focusable element on the page; jumps keyboard/screen-reader users to <main>.
export function SkipLink() {
  const t = useTranslations("a11y");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
    >
      {t("skipToContent")}
    </a>
  );
}

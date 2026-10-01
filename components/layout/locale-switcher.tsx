"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";

export function LocaleSwitcher({
  variant = "light",
}: {
  /**
   * "dark" tints the control for a dark surface (e.g. the footer); "ivory"
   * matches the public masthead. "light" is the admin default.
   */
  variant?: "light" | "dark" | "ivory";
}) {
  const t = useTranslations("a11y");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    startTransition(() => {
      // Preserve the current route (including any dynamic params) under the new locale.
      router.replace({ pathname, params } as never, { locale: next });
    });
  }

  const selectClassName =
    variant === "ivory"
      ? "h-9 cursor-pointer rounded-full border border-[rgb(42_34_24/0.18)] bg-transparent px-3 text-sm text-[var(--mt-charcoal)] transition-colors hover:border-[var(--mt-terracotta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-terracotta)] disabled:opacity-60"
      : variant === "dark"
      ? "border border-white/20 bg-transparent px-2 py-1.5 text-xs text-[var(--mt-paper)] [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-color)] sm:text-sm"
      : "rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <label>
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={onChange}
        disabled={pending}
        className={selectClassName}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

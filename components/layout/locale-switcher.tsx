"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";

export function LocaleSwitcher({
  variant = "light",
}: {
  /** "dark" tints the control for placement on a dark surface (e.g. the footer). */
  variant?: "light" | "dark";
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
    variant === "dark"
      ? "rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-cream-100 [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-300"
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

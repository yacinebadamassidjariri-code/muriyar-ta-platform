"use client";

import { LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/** Always-visible path to crisis resources. */
export function CrisisLink() {
  const t = useTranslations("crisis");
  const pathname = usePathname();
  const active =
    pathname === "/resources/crisis" ||
    pathname.startsWith("/resources/crisis/");

  return (
    <Link
      href="/resources/crisis"
      aria-label={t("getHelp")}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium tracking-wide transition-colors hover:border-[var(--mt-rust-soft)] hover:bg-[var(--mt-rust)]/20 hover:text-[var(--mt-text-on-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-color)] sm:px-3",
        active
          ? "border-[var(--mt-rust-soft)] bg-[var(--mt-rust)]/20 text-[var(--mt-text-on-dark)]"
          : "border-[var(--mt-rust-bright)]/60 text-[var(--mt-rust-soft)]",
      )}
    >
      <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{t("getHelp")}</span>
    </Link>
  );
}

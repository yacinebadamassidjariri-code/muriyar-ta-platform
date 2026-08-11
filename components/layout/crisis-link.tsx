"use client";

import { LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Always-visible path to crisis resources (PRD 21.2). Designed as a permanent
 * editorial utility for the dark masthead, not an application button: a
 * hairline-outlined pill in warm rose with the life-buoy glyph, echoing the
 * footer's rose crisis accent. Calm on the deep-plum surface but unmistakably a
 * distinct "get help" object, set apart from the primary navigation. Visible at
 * every breakpoint — it never collapses into the menu.
 */
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium tracking-wide transition-colors hover:border-rose-200/70 hover:bg-rose-500/20 hover:text-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-300/70 sm:px-3",
        active
          ? "border-rose-200/70 bg-rose-500/20 text-rose-100"
          : "border-rose-200/40 bg-rose-500/10 text-rose-200",
      )}
    >
      <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{t("getHelp")}</span>
    </Link>
  );
}
